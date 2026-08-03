import { LogLevelThreshold } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';

/**
 * Whether the logger is verbose enough that full SDK inputs — payloads, secret
 * material and PII — may be written to the log.
 *
 * **This is the only place in the package that reads the log level.** Never
 * compare `logger.getLevelName()` yourself: Powertools orders `TRACE` as *more*
 * verbose than `DEBUG` (thresholds 6 and 8), so the obvious
 * `getLevelName() === 'DEBUG'` check silently redacts at the most verbose level
 * available. Route every disclosure decision through this predicate instead.
 */
export function shouldLogFullInput(logger: LoggerInterface): boolean {
    return LogLevelThreshold[logger.getLevelName()] <= LogLevelThreshold.DEBUG;
}

/**
 * Return a log-safe projection of `input` based on the logger's configured level.
 *
 * At `DEBUG`, the full input is returned unchanged — operators who set
 * `POWERTOOLS_LOG_LEVEL=DEBUG` (or call `logger.setLogLevel('DEBUG')`) have
 * explicitly opted into seeing everything, including payloads, secret material
 * and PII.
 *
 * At any other level, only the fields listed in `safeFields` are included.
 * Missing fields are silently skipped — the result type narrows to
 * `Pick<T, K>` accordingly.
 *
 * Used across the package so that the "what's safe to log at INFO" decision
 * lives in one place. See `packages/aws-wrappers/CLAUDE.md` ("Logging") for
 * the design rationale and conventions on building the safe-field lists.
 */
export function filterFieldsForLogLevel<T extends object, K extends keyof T>(
    logger: LoggerInterface,
    input: T,
    safeFields: readonly K[]
): T | Pick<T, K> {
    if (shouldLogFullInput(logger)) return input;
    const out = {} as Pick<T, K>;
    for (const key of safeFields) {
        if (key in input) out[key] = input[key];
    }
    return out;
}
