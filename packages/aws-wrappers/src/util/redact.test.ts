import { Logger } from '@aws-lambda-powertools/logger';
import type { LogLevel } from '@aws-lambda-powertools/logger/types';
import { describe, expect, it } from 'vitest';
import { filterFieldsForLogLevel, shouldLogFullInput } from './redact';

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

describe('shouldLogFullInput', () => {
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

    it.each(cases)('at %s level returns %s', (level, expected) => {
        expect(shouldLogFullInput(buildLogger(level))).toBe(expected);
    });
});

describe('filterFieldsForLogLevel', () => {
    it('returns only the listed fields when the logger is at INFO level', () => {
        const input = { TopicArn: 'arn', Message: 'shh', Subject: 'private' };

        const result = filterFieldsForLogLevel(buildLogger('INFO'), input, ['TopicArn']);

        expect(result).toEqual({ TopicArn: 'arn' });
    });

    it('returns the full input at DEBUG level', () => {
        const input = { TopicArn: 'arn', Message: 'shh', Subject: 'private' };

        const result = filterFieldsForLogLevel(buildLogger('DEBUG'), input, ['TopicArn']);

        expect(result).toEqual(input);
    });

    it('returns the full input at TRACE level', () => {
        const input = { TopicArn: 'arn', Message: 'shh', Subject: 'private' };

        const result = filterFieldsForLogLevel(buildLogger('TRACE'), input, ['TopicArn']);

        expect(result).toEqual(input);
    });

    it('returns the safe subset at WARN level too', () => {
        const input = { TopicArn: 'arn', Message: 'shh' };

        const result = filterFieldsForLogLevel(buildLogger('WARN'), input, ['TopicArn']);

        expect(result).toEqual({ TopicArn: 'arn' });
    });

    it('skips safe fields that are absent from the input', () => {
        const input: { TopicArn: string; Subject?: string } = { TopicArn: 'arn' };

        const result = filterFieldsForLogLevel(buildLogger('INFO'), input, ['TopicArn', 'Subject']);

        expect(result).toEqual({ TopicArn: 'arn' });
        expect('Subject' in result).toBe(false);
    });
});
