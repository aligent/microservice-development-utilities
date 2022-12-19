/** Configuration for the retryWrapper */
interface RetryConfig {
    /** The number of retries to attempt after the first run (default: 1)*/
    retries?: number;
    /** The base delay between retries in ms (default: 0ms)*/
    delay?: number;
    /** The amount to linearly increase the delay by each retry in ms (default: 0ms)*/
    backoffRate?: number;
    /**
     * A callback to run before each retry
     * @param retries the number of retries so far (will start at 1)
     * @param error the error from the last attempt
     */
    onRetry?: (retries: number, error: Error, config: RetryConfig) => void;
}

/**
 * Retry an async function if it fails
 * @param fn the function to be retried
 * @param config the configuration for retries
 * @param retryCount the number of retries so far
 * @param error the error from teh last retry
 */
async function retryWrapperInternal<T>(
    fn: () => Promise<T>,
    config: Required<RetryConfig>,
    retryCount: number,
    error?: Error
): Promise<T> {
    if (config.retries < 0) {
        throw error;
    }
    if (error) {
        if (config.onRetry) {
            config.onRetry(retryCount, error, config);
        }
    }
    try {
        const result = await fn();
        return result;
    } catch (err) {
        await (() => new Promise((res) => setTimeout(res, config.delay)))();
        return await retryWrapperInternal(
            fn,
            {
                ...config,
                retries: config.retries - 1,
                delay: config.delay + config.backoffRate,
            },
            retryCount + 1,
            err
        );
    }
}

/**
 * Retry an async function if it fails
 * @param fn the function to be retried
 * @param config the configuration for retries
 */
async function retryWrapper<T>(
    fn: () => Promise<T>,
    config: RetryConfig
): Promise<T> {
    const defaultConfig: Required<RetryConfig> = {
        retries: 1,
        delay: 0,
        backoffRate: 0,
        onRetry: () => null
    };
    return await retryWrapperInternal(
        fn,
        {
            ...defaultConfig,
            ...config
        },
        0
    );
}

export { RetryConfig };
export default retryWrapper;
