import retryWrapper from './retry-wrapper';

/**
 * Replaces global setTimeout with one that resolves on the next tick (no real wait)
 * while reporting the requested delay to `onSchedule` — shared by the `calculateDelay`
 * and `deadline` describe blocks below, which both need this but for different reasons
 * (capturing the scheduled delays vs. advancing a virtual clock by them).
 */
const mockImmediateSetTimeout = (onSchedule: (ms: number) => void) => {
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: () => void, ms?: number) => {
        onSchedule(ms ?? 0);
        return realSetTimeout(callback, 0);
    }) as typeof setTimeout);
};

describe('retryWrapper', () => {
    it("returns function's result", async () => {
        const result = await retryWrapper(async () => 3, {
            retries: 1,
        });
        expect(result).toBe(3);
    });

    it('retries the function the correct amount of times', async () => {
        const fn = vi.fn(async () => {
            throw new Error('Test Error');
        });

        try {
            await retryWrapper(fn, { retries: 3 });
        } catch {
            expect(fn).toHaveBeenCalledTimes(4);
        }
    });

    it('errors if the function returns an error every time', async () => {
        const fn = vi.fn(async () => {
            throw new Error('Test Error');
        });

        try {
            await retryWrapper(fn, { retries: 3 });
        } catch (ex) {
            expect(ex).toBeTruthy();
        }
    });

    it('retries after error', async () => {
        let count = 0;
        const fn = vi.fn(async () => {
            if (count < 2) {
                count++;
                throw new Error('Test Error');
            }
            return true;
        });

        expect(await retryWrapper(fn, { retries: 3 })).toBe(true);
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it('adds a delay between tries', async () => {
        const fn = vi.fn(async () => {
            throw new Error('Test Error');
        });

        const retries = 3;
        const delay = 300;

        const startTime = Date.now();

        try {
            await retryWrapper(fn, {
                retries,
                delay,
            });
            // eslint-disable-next-line no-empty
        } catch {}

        const totalTime = Date.now() - startTime;

        expect(totalTime).toBeGreaterThanOrEqual((retries + 1) * delay);
    });

    it('calls the onRetry function when a retry happens', async () => {
        const onRetry = vi.fn();
        const fn = vi.fn(async () => {
            throw new Error('Test Error');
        });

        try {
            await retryWrapper(fn, {
                retries: 1,
                onRetry,
            });
            // eslint-disable-next-line no-empty
        } catch {}

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('accurately counts retries', async () => {
        const onRetry = vi.fn();
        const err = new Error('Test Error');
        const fn = vi.fn(async () => {
            throw err;
        });

        try {
            await retryWrapper(fn, {
                retries: 3,
                onRetry,
            });
            // eslint-disable-next-line no-empty
        } catch {}

        expect(onRetry).toHaveBeenLastCalledWith(3, err, {
            retries: 0,
            onRetry,
            delay: 0,
            backoffAmount: 0,
            // Resolved defaults added for shouldRetry/calculateDelay — asserted by
            // shape only, since the default functions aren't exported to reference here.
            shouldRetry: expect.any(Function),
            calculateDelay: expect.any(Function),
        });
    });

    describe('shouldRetry', () => {
        it('rethrows immediately without retrying when shouldRetry returns false', async () => {
            const err = new Error('Not retryable');
            const fn = vi.fn(async () => {
                throw err;
            });
            const shouldRetry = vi.fn(() => false);

            await expect(retryWrapper(fn, { retries: 3, shouldRetry })).rejects.toBe(err);
            expect(fn).toHaveBeenCalledTimes(1);
            expect(shouldRetry).toHaveBeenCalledTimes(1);
        });

        it('retries as usual while shouldRetry returns true, passing a 1-indexed attempt', async () => {
            const fn = vi.fn(async () => {
                throw new Error('Test Error');
            });
            const shouldRetry = vi.fn((_error: Error, _attempt: number) => true);

            try {
                await retryWrapper(fn, { retries: 2, shouldRetry });
                // eslint-disable-next-line no-empty
            } catch {}

            expect(fn).toHaveBeenCalledTimes(3);
            expect(shouldRetry.mock.calls.map(([, attempt]) => attempt)).toEqual([1, 2, 3]);
        });
    });

    describe('calculateDelay', () => {
        /**
         * Observes the delay each retry actually schedules via setTimeout, rather than
         * measuring elapsed wall-clock time — mirrors the approach in
         * retry-fetch.test.ts, which found wall-clock timing flaky on a loaded CI box.
         */
        const scheduledDelays = async (config: Parameters<typeof retryWrapper>[1]) => {
            const delays: number[] = [];
            mockImmediateSetTimeout(ms => delays.push(ms));

            const fn = vi.fn(async () => {
                throw new Error('Test Error');
            });

            try {
                await retryWrapper(fn, config);
                // eslint-disable-next-line no-empty
            } catch {
            } finally {
                vi.mocked(globalThis.setTimeout).mockRestore();
            }

            return delays;
        };

        it('keeps the default linear growth when calculateDelay is omitted', async () => {
            expect(await scheduledDelays({ retries: 3, delay: 100, backoffAmount: 50 })).toEqual([
                100, 150, 200, 250,
            ]);
        });

        it('uses calculateDelay to compute a custom delay per attempt', async () => {
            const calculateDelay = vi.fn((attempt: number) => attempt * 20);

            expect(await scheduledDelays({ retries: 3, delay: 10, calculateDelay })).toEqual([
                10, 20, 40, 60,
            ]);
        });
    });

    describe('deadline', () => {
        /**
         * A virtual clock: setTimeout resolves immediately (no real wait) but advances a
         * mocked Date.now() by the requested delay first, so elapsed-time checks against
         * `deadline` behave exactly as they would with real timers, deterministically.
         */
        const withVirtualClock = async <T>(run: () => Promise<T>): Promise<T> => {
            let elapsed = 0;
            vi.spyOn(Date, 'now').mockImplementation(() => elapsed);
            mockImmediateSetTimeout(ms => {
                elapsed += ms;
            });

            try {
                return await run();
            } finally {
                vi.mocked(globalThis.setTimeout).mockRestore();
                vi.mocked(Date.now).mockRestore();
            }
        };

        it('gives up once the deadline is exceeded, regardless of retries remaining', async () => {
            const err = new Error('Test Error');
            const fn = vi.fn(async () => {
                throw err;
            });

            await withVirtualClock(() =>
                expect(
                    retryWrapper(fn, { retries: 5, delay: 100, backoffAmount: 100, deadline: 250 })
                ).rejects.toBe(err)
            );

            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('does not affect retries that complete within the deadline', async () => {
            let count = 0;
            const fn = vi.fn(async () => {
                if (count < 2) {
                    count++;
                    throw new Error('Test Error');
                }
                return true;
            });

            const result = await withVirtualClock(() =>
                retryWrapper(fn, { retries: 3, delay: 10, deadline: 10_000 })
            );

            expect(result).toBe(true);
            expect(fn).toHaveBeenCalledTimes(3);
        });
    });
});
