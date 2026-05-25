import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';

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
    if (logger.getLevelName() === 'DEBUG') return input;
    const out = {} as Pick<T, K>;
    for (const key of safeFields) {
        if (key in input) out[key] = input[key];
    }
    return out;
}
