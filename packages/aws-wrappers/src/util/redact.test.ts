import { Logger } from '@aws-lambda-powertools/logger';
import { describe, expect, it } from 'vitest';
import { filterFieldsForLogLevel } from './redact';

const buildLogger = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR') => {
    const logger = new Logger();
    logger.setLogLevel(level);
    return logger;
};

describe('filterFieldsForLogLevel', () => {
    it('returns only the listed fields when the logger is at INFO level', () => {
        const input = { TopicArn: 'arn', Message: 'shh', Subject: 'private' };

        const result = filterFieldsForLogLevel(buildLogger('INFO'), input, ['TopicArn']);

        expect(result).toEqual({ TopicArn: 'arn' });
    });

    it('returns the full input when the logger is at DEBUG level', () => {
        const input = { TopicArn: 'arn', Message: 'shh', Subject: 'private' };

        const result = filterFieldsForLogLevel(buildLogger('DEBUG'), input, ['TopicArn']);

        expect(result).toEqual(input);
    });

    it('skips safe fields that are absent from the input', () => {
        const input: { TopicArn: string; Subject?: string } = { TopicArn: 'arn' };

        const result = filterFieldsForLogLevel(buildLogger('INFO'), input, ['TopicArn', 'Subject']);

        expect(result).toEqual({ TopicArn: 'arn' });
        expect('Subject' in result).toBe(false);
    });
});
