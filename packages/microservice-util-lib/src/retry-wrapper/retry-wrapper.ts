/**
 * A minimal, injectable clock/timer abstraction. Keeping `now`/`sleep` behind this
 * interface (rather than calling `Date.now()`/`setTimeout` directly in
 * `retryWrapperInternal`) is what makes the `deadline` check unit-testable with
 * `vi.useFakeTimers()` — it's an internal implementation detail, not part of the
 * public `RetryWrapperConfig` API.
 */
interface RetryRuntime {
    /** The current time in ms, analogous to `Date.now()`. */
    now: () => number;
    /** Resolves once the given number of ms have elapsed. */
    sleep: (ms: number) => Promise<void>;
}

const defaultRetryRuntime: RetryRuntime = {
    now: () => Date.now(),
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
};

/** Configuration for the retryWrapper */
interface RetryWrapperConfig {
    /**
     * The number of retries to attempt after the first run
     * @default 1
     */
    retries?: number;
    /**
     * The base delay between retries (in ms)
     * @default 0
     */
    delay?: number;
    /**
     * The amount to increase the delay by each retry (in ms)
     * @default 0
     */
    backoffAmount?: number;
    /**
     * A callback to run before each retry. Not called once `retries` are exhausted,
     * or when `shouldRetry`/`deadline` prevent a further attempt — only fires before
     * an attempt that's actually about to happen.
     * @param retries the number of retries so far (will start at 1)
     * @param error the error from the last attempt
     * @param config the configuration supplied to the retryWrapper
     * @param delayMs the delay (ms) that was actually just waited before this retry —
     * `config.delay` itself already holds the delay `calculateDelay` computed for the
     * *next* retry, not the one that was just waited, so read this instead of that
     */
    onRetry?: (retries: number, error: Error, config: RetryWrapperConfig, delayMs: number) => void;
    /**
     * Decides whether a given error should trigger a retry. Checked before any delay
     * is calculated; returning false rethrows the error immediately instead of
     * continuing to retry. Not called once `retries` are exhausted — there's nothing
     * left to retry regardless of what this returns.
     * @param error the error from the last attempt
     * @param attempt the retry attempt about to be made (1-indexed, matching `onRetry`)
     * @default () => true — retries every error
     */
    shouldRetry?: (error: Error, attempt: number) => boolean | Promise<boolean>;
    /**
     * Computes the delay (ms) before the next retry. Not called once `retries` are
     * exhausted, for the same reason as `shouldRetry`.
     * @param attempt the retry attempt about to be made (1-indexed, matching `onRetry`)
     * @param previousDelay the delay (ms) that was used for the attempt that just failed
     * @param config the configuration supplied to the retryWrapper
     * @default (attempt, previousDelay, config) => previousDelay + config.backoffAmount — linear growth
     */
    calculateDelay?: (
        attempt: number,
        previousDelay: number,
        config: RetryWrapperConfig
    ) => number | Promise<number>;
    /**
     * Total wall-clock ms budget across all attempts, measured from the first call.
     * Once the elapsed time plus the delay before the next retry would exceed this
     * budget, that retry is skipped and the last error is thrown immediately,
     * regardless of `retries` remaining. This bounds when the next attempt *starts*,
     * not how long an individual `fn()` invocation may run — a slow attempt can still
     * finish after the deadline has passed.
     * @default undefined — no deadline, `retries` is the only bound
     */
    deadline?: number;
}

/**
 * `RetryWrapperConfig` with every field defaulted, except `deadline` — which has no
 * sensible non-`undefined` default, since its absence means "no deadline" rather than
 * "deadline of 0".
 */
type ResolvedRetryWrapperConfig = Required<Omit<RetryWrapperConfig, 'deadline'>> &
    Pick<RetryWrapperConfig, 'deadline'>;

/**
 * Retry an async function if it fails
 * @param fn the function to be retried
 * @param config the configuration for retries
 * @param retryCount the number of retries so far
 * @param startTime the timestamp (ms) the first attempt started, used to enforce `config.deadline`
 * @param runtime the clock/timer abstraction backing `now()`/`sleep()`
 * @param error the error from the last retry
 * @param delayMs the delay (ms) that was just waited before this retry, passed through to `onRetry`
 */
async function retryWrapperInternal<T>(
    fn: () => Promise<T>,
    config: ResolvedRetryWrapperConfig,
    retryCount: number,
    startTime: number,
    runtime: RetryRuntime,
    error?: Error,
    delayMs = 0
): Promise<T> {
    if (error) {
        if (config.onRetry) {
            config.onRetry(retryCount, error, config, delayMs);
        }
    }
    try {
        const result = await fn();
        return result;
    } catch (err) {
        const caughtError = err as Error;

        // No retries left: rethrow the error this attempt actually produced, without
        // running shouldRetry/calculateDelay or sleeping — there's no further attempt
        // for either hook to influence, and (now that both can be async and can
        // throw) invoking them here would risk masking caughtError with an unrelated
        // failure from a hook that was never going to change the outcome.
        if (config.retries <= 0) {
            throw caughtError;
        }

        const attempt = retryCount + 1;

        if (!(await config.shouldRetry(caughtError, attempt))) {
            throw caughtError;
        }

        const waitedDelay = config.delay;

        // A real deadline bounds when the *next attempt starts*, not just where
        // "now" happens to be when this check runs — so it must account for the
        // sleep about to happen, not merely the time elapsed so far. Checking only
        // `now() - startTime >= deadline` would let a long `waitedDelay` push the
        // next attempt well past the budget before the overrun is ever detected.
        if (config.deadline !== undefined) {
            const remaining = config.deadline - (runtime.now() - startTime);
            if (remaining <= 0 || waitedDelay >= remaining) {
                throw caughtError;
            }
        }

        // calculateDelay's inputs don't depend on the sleep finishing, so run them
        // concurrently — otherwise an async calculateDelay (e.g. one that fetches a
        // remote backoff hint) would add its own latency on top of the sleep instead
        // of overlapping with it.
        const [, nextDelay] = await Promise.all([
            runtime.sleep(waitedDelay),
            config.calculateDelay(attempt, config.delay, config),
        ]);
        return await retryWrapperInternal(
            fn,
            {
                ...config,
                retries: config.retries - 1,
                delay: nextDelay,
            },
            attempt,
            startTime,
            runtime,
            caughtError,
            waitedDelay
        );
    }
}

// Stateless, so hoisted to module scope (same reasoning as defaultRetryRuntime above)
// rather than reallocated as new closures on every retryWrapper() call.
const defaultOnRetry: NonNullable<RetryWrapperConfig['onRetry']> = () => null;
const defaultShouldRetry: NonNullable<RetryWrapperConfig['shouldRetry']> = () => true;
const defaultCalculateDelay: NonNullable<RetryWrapperConfig['calculateDelay']> = (
    _attempt,
    previousDelay,
    cfg
) => previousDelay + (cfg.backoffAmount ?? 0);

/**
 * Retry an async function if it fails
 * @param fn the function to be retried
 * @param config the configuration for retries
 * @example
 * ```ts
 * retryWrapper(someAsyncFunction, {
 *   retries: 3,
 *   onRetry: (_, error) => console.error(error)
 * });
 * ```
 * @example
 * ```ts
 * // Only retry a specific error, back off exponentially with jitter, and give up
 * // after 10s regardless of retries remaining
 * retryWrapper(someAsyncFunction, {
 *   retries: 5,
 *   delay: 100,
 *   shouldRetry: (error) => error.name === 'TransientError',
 *   calculateDelay: exponentialJitter(100, 5000),
 *   deadline: 10_000,
 * });
 * ```
 */
async function retryWrapper<T>(fn: () => Promise<T>, config: RetryWrapperConfig): Promise<T> {
    const defaultConfig: ResolvedRetryWrapperConfig = {
        retries: 1,
        delay: 0,
        backoffAmount: 0,
        onRetry: defaultOnRetry,
        shouldRetry: defaultShouldRetry,
        calculateDelay: defaultCalculateDelay,
    };
    return await retryWrapperInternal(
        fn,
        {
            ...defaultConfig,
            ...config,
        },
        0,
        defaultRetryRuntime.now(),
        defaultRetryRuntime
    );
}

/**
 * A ready-made {@link RetryWrapperConfig.calculateDelay} strategy: full-jitter
 * exponential backoff, picking the delay for a given attempt uniformly at random
 * between 0 and `min(maxDelay, baseDelay * 2 ** attempt)`. Saves hand-rolling this
 * `Math.random()`/`Math.min()` formula per caller.
 * @param baseDelay the starting delay (ms), before exponential growth and jitter
 * @param maxDelay the delay (ms) ceiling, applied before jitter narrows it further
 * @example
 * ```ts
 * // `delay` (the wait before the *first* retry) isn't itself computed by
 * // calculateDelay, so set it explicitly — here, matching baseDelay — or the
 * // first retry fires with the default 0ms delay before backoff kicks in.
 * retryWrapper(someAsyncFunction, {
 *   retries: 5,
 *   delay: 100,
 *   calculateDelay: exponentialJitter(100, 5000),
 * });
 * ```
 */
function exponentialJitter(baseDelay: number, maxDelay: number): (attempt: number) => number {
    return attempt => Math.random() * Math.min(maxDelay, baseDelay * 2 ** attempt);
}

/**
 * @deprecated Renamed to {@link RetryWrapperConfig}. The old name collided with the retry
 * middleware's own config, which forced it to be re-exported as `RetryMiddlewareConfig`.
 */
type RetryConfig = RetryWrapperConfig;

export { exponentialJitter };
export type { RetryConfig, RetryWrapperConfig };
export default retryWrapper;
