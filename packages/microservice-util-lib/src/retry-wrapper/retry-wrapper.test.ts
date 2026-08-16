import retryWrapper, { exponentialJitter } from './retry-wrapper';

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

        // Asserts the delay actually scheduled via setTimeout, rather than elapsed
        // wall-clock time — the previous version of this test measured Date.now()
        // before/after, which was flaky by a millisecond or two on a loaded CI box.
        const delays: number[] = [];
        mockImmediateSetTimeout(ms => delays.push(ms));

        try {
            await retryWrapper(fn, {
                retries,
                delay,
            });
            // eslint-disable-next-line no-empty
        } catch {
        } finally {
            vi.mocked(globalThis.setTimeout).mockRestore();
        }

        // One sleep per attempt that's actually followed by another (retries of
        // them) — the final, exhausted attempt's failure rethrows immediately
        // without sleeping, since there's no further attempt for the wait to precede.
        expect(delays).toEqual(Array(retries).fill(delay));
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

        expect(onRetry).toHaveBeenLastCalledWith(
            3,
            err,
            {
                retries: 0,
                onRetry,
                delay: 0,
                backoffAmount: 0,
                // Resolved defaults added for shouldRetry/calculateDelay — asserted by
                // shape only, since the default functions aren't exported to reference here.
                shouldRetry: expect.any(Function),
                calculateDelay: expect.any(Function),
            },
            // delayMs — the delay actually waited before this retry. 0 here since no
            // delay/backoffAmount was configured.
            0
        );
    });

    it('passes onRetry the delay that was actually waited, not the one config.delay already grew to', async () => {
        const onRetry = vi.fn();
        const fn = vi.fn(async () => {
            throw new Error('Test Error');
        });
        mockImmediateSetTimeout(() => {});

        try {
            await retryWrapper(fn, { retries: 2, delay: 10, backoffAmount: 10, onRetry });
            // eslint-disable-next-line no-empty
        } catch {
        } finally {
            vi.mocked(globalThis.setTimeout).mockRestore();
        }

        // config.delay has already grown to the *next* retry's delay by the time
        // onRetry reads it (20, 30) — delayMs reports what was actually just waited.
        expect(onRetry.mock.calls.map(([, , , delayMs]) => delayMs)).toEqual([10, 20]);
        expect(onRetry.mock.calls.map(([, , config]) => config.delay)).toEqual([20, 30]);
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

            // 3 attempts happen (retries + 1), but shouldRetry is only consulted
            // ahead of the 2 that are actually followed by another — the final,
            // exhausted attempt's failure rethrows without asking shouldRetry, since
            // there's no retry left for its answer to affect.
            expect(fn).toHaveBeenCalledTimes(3);
            expect(shouldRetry.mock.calls.map(([, attempt]) => attempt)).toEqual([1, 2]);
        });

        it('accepts an async shouldRetry, awaiting its result before continuing', async () => {
            const err = new Error('Not retryable');
            const fn = vi.fn(async () => {
                throw err;
            });
            const shouldRetry = vi.fn(async () => false);

            await expect(retryWrapper(fn, { retries: 3, shouldRetry })).rejects.toBe(err);
            expect(fn).toHaveBeenCalledTimes(1);
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

        // 3 sleeps (retries), not 4 — the final, exhausted attempt's failure
        // rethrows immediately without a wasted trailing sleep. See the
        // "adds a delay between tries" test above for the same reasoning.

        it('keeps the default linear growth when calculateDelay is omitted', async () => {
            expect(await scheduledDelays({ retries: 3, delay: 100, backoffAmount: 50 })).toEqual([
                100, 150, 200,
            ]);
        });

        it('uses calculateDelay to compute a custom delay per attempt', async () => {
            const calculateDelay = vi.fn((attempt: number) => attempt * 20);

            expect(await scheduledDelays({ retries: 3, delay: 10, calculateDelay })).toEqual([
                10, 20, 40,
            ]);
        });

        it('accepts an async calculateDelay, awaiting its result before sleeping', async () => {
            const calculateDelay = vi.fn(async (attempt: number) => attempt * 20);

            expect(await scheduledDelays({ retries: 3, delay: 10, calculateDelay })).toEqual([
                10, 20, 40,
            ]);
        });

        it('is not called once retries are exhausted, so it cannot mask the real error', async () => {
            const originalError = new Error('original failure');
            const calculateDelay = vi.fn(async () => {
                throw new Error('delay calculation failed');
            });
            const shouldRetry = vi.fn();

            await expect(
                retryWrapper(() => Promise.reject(originalError), {
                    retries: 0,
                    calculateDelay,
                    shouldRetry,
                })
            ).rejects.toBe(originalError);

            expect(shouldRetry).not.toHaveBeenCalled();
            expect(calculateDelay).not.toHaveBeenCalled();
        });
    });

    describe('exponentialJitter', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('is 0 when Math.random() returns 0', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const delay = exponentialJitter(100, 5000);

            expect(delay(1)).toBe(0);
            expect(delay(3)).toBe(0);
        });

        it('scales exponentially with attempt, capped at maxDelay', () => {
            // Math.random() never actually returns 1, but pinning it there lets this
            // test assert the uncapped/capped boundary deterministically.
            vi.spyOn(Math, 'random').mockReturnValue(1);
            const delay = exponentialJitter(100, 5000);

            expect(delay(1)).toBe(200); // 100 * 2^1
            expect(delay(2)).toBe(400); // 100 * 2^2
            expect(delay(10)).toBe(5000); // 100 * 2^10 = 102_400, capped at maxDelay
        });

        it('stays within [0, cap] across a range of attempts and random fractions', () => {
            const baseDelay = 50;
            const maxDelay = 1000;
            const delay = exponentialJitter(baseDelay, maxDelay);

            for (const random of [0, 0.25, 0.5, 0.75, 1]) {
                vi.spyOn(Math, 'random').mockReturnValue(random);

                for (const attempt of [1, 2, 3, 4, 5, 8]) {
                    const cap = Math.min(maxDelay, baseDelay * 2 ** attempt);
                    expect(delay(attempt)).toBeGreaterThanOrEqual(0);
                    expect(delay(attempt)).toBeLessThanOrEqual(cap);
                }
            }
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

            // 1st failure at t=0: waitedDelay=100, remaining=250 — 100 < 250, sleeps, t=100.
            // 2nd failure at t=100: waitedDelay=200 (100 + backoffAmount), remaining=150 —
            // sleeping the full 200ms would land at t=300, past the 250 deadline, so this
            // is refused *before* sleeping (not just detected afterwards via a 3rd attempt
            // that shouldn't have been allowed to start).
            expect(fn).toHaveBeenCalledTimes(2);
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
