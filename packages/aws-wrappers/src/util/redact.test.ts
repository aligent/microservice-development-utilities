import { Logger } from '@aws-lambda-powertools/logger';
import type { LogLevel } from '@aws-lambda-powertools/logger/types';
import { describe, expect, it, vi } from 'vitest';
import { redactInput } from './redact';

/**
 * Levels must be uppercase — `setLogLevel('trace')` throws, despite Powertools'
 * `LogLevel` type admitting lowercase spellings.
 */
type Level = Uppercase<LogLevel>;

const buildLogger = (level: Level) => {
    const logger = new Logger();
    logger.setLogLevel(level);
    return logger;
};

/**
 * Powertools orders TRACE (6) as more verbose than DEBUG (8), so both
 * unlock. The boundary sits between DEBUG and INFO.
 *
 * Typed as a `Record` over every level rather than an array of cases: if
 * Powertools adds a level, this stops compiling instead of silently
 * leaving the new level untested.
 */
const unlocksByLevel: Record<Level, boolean> = {
    TRACE: true,
    DEBUG: true,
    INFO: false,
    WARN: false,
    ERROR: false,
    CRITICAL: false,
    SILENT: false,
};

const cases = Object.entries(unlocksByLevel) as Array<[Level, boolean]>;

describe('redactInput', () => {
    const input = { TopicArn: 'arn', Message: 'shh', Subject: 'private' };
    const projected = { TopicArn: 'arn' };

    describe('with a field list', () => {
        it.each(cases)('at %s level returns the full input: %s', (level, unlocked) => {
            const result = redactInput(buildLogger(level), input, ['TopicArn']);

            expect(result).toEqual(unlocked ? input : projected);
        });

        it('skips fields that are absent from the input', () => {
            const sparse: { TopicArn: string; Subject?: string } = { TopicArn: 'arn' };

            const result = redactInput(buildLogger('INFO'), sparse, ['TopicArn', 'Subject']);

            expect(result).toEqual({ TopicArn: 'arn' });
            expect('Subject' in result).toBe(false);
        });
    });

    describe('with a projection function', () => {
        const project = (value: typeof input) => ({ hasMessage: value.Message.length > 0 });

        it.each(cases)('at %s level returns the full input: %s', (level, unlocked) => {
            const result = redactInput(buildLogger(level), input, project);

            expect(result).toEqual(unlocked ? input : { hasMessage: true });
        });

        it('does not invoke the projection when the full input is returned', () => {
            const spy = vi.fn(project);

            redactInput(buildLogger('TRACE'), input, spy);

            expect(spy).not.toHaveBeenCalled();
        });
    });
});
