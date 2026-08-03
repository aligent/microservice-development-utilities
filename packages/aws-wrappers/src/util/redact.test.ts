import { Logger } from '@aws-lambda-powertools/logger';
import { describe, expect, it } from 'vitest';
import { filterFieldsForLogLevel, shouldLogFullInput } from './redact';

/**
 * Levels must be uppercase — `setLogLevel('trace')` throws, despite Powertools'
 * `LogLevel` type admitting lowercase spellings.
 */
type Level = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'SILENT';

const buildLogger = (level: Level) => {
    const logger = new Logger();
    logger.setLogLevel(level);
    return logger;
};

describe('shouldLogFullInput', () => {
    // Powertools orders TRACE (6) as more verbose than DEBUG (8), so both
    // unlock. The boundary sits between DEBUG and INFO.
    const cases: Array<[Level, boolean]> = [
        ['TRACE', true],
        ['DEBUG', true],
        ['INFO', false],
        ['WARN', false],
        ['ERROR', false],
        ['CRITICAL', false],
        ['SILENT', false],
    ];

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
