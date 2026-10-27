import { LogLevelThreshold } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';

/**
 * Whether the logger is verbose enough that full SDK inputs may be written to
 * the log. The unlock rule is documented on {@link redactInput}.
 */
export function shouldLogFullInput(logger: LoggerInterface): boolean {
    return LogLevelThreshold[logger.getLevelName()] <= LogLevelThreshold.DEBUG;
}

/**
 * Return a log-safe projection of `input` based on the logger's configured level.
 *
 * At the verbose levels (`TRACE` and `DEBUG`) the full input is returned
 * unchanged: operators who asked for that verbosity have explicitly opted into
 * seeing everything, including payloads, secret material and PII. At any other
 * level the projection is returned instead.
 *
 * **This module is the only place in the package that reads the log level.**
 * Never compare `logger.getLevelName()` yourself: Powertools orders `TRACE` as
 * *more* verbose than `DEBUG` (thresholds 6 and 8), so the obvious
 * `getLevelName() === 'DEBUG'` check silently redacts at the most verbose level
 * available. Route every disclosure decision through this function instead.
 *
 * `project` is either a list of top-level keys to keep (absent keys are
 * silently skipped, so the result narrows to `Pick<T, K>`) or a function from
 * the input to a safe shape. Prefer the key list: it is safe by default, since
 * a new SDK field is not logged until someone allowlists it. Use a function
 * only for computed shapes such as counts, and keep it small.
 *
 * Used across the package so that the "what's safe to log at INFO" decision
 * lives in one place. See `packages/aws-wrappers/CLAUDE.md` ("Logging") for
 * the design rationale and conventions on building the safe-field lists.
 */
export function redactInput<T extends object, K extends keyof T>(
    logger: LoggerInterface,
    input: T,
    project: readonly K[]
): T | Pick<T, K>;
export function redactInput<T extends object, R>(
    logger: LoggerInterface,
    input: T,
    project: (input: T) => R
): T | R;
export function redactInput<T extends object, K extends keyof T, R>(
    logger: LoggerInterface,
    input: T,
    project: readonly K[] | ((input: T) => R)
): T | Pick<T, K> | R {
    if (shouldLogFullInput(logger)) return input;
    if (typeof project === 'function') return project(input);
    return pickKeys(input, project);
}

function pickKeys<T extends object, K extends keyof T>(input: T, keys: readonly K[]): Pick<T, K> {
    const out = {} as Pick<T, K>;
    for (const key of keys) {
        if (key in input) out[key] = input[key];
    }
    return out;
}
