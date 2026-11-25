import { Logger } from '@aws-lambda-powertools/logger';
import {
    SendBulkEmailCommand,
    SendBulkEmailCommandInput,
    SendEmailCommand,
    SESv2Client,
} from '@aws-sdk/client-sesv2';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { batchFailure } from '../util/batch-operation-error.test-helpers.js';
import { SESService } from './ses.js';

const sesMock = mockClient(SESv2Client);

describe('SESService', () => {
    afterEach(() => {
        sesMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new SESService()).not.toThrow();
    });

    describe('sendEmail', () => {
        it('sends the input unchanged and returns the SDK output', async () => {
            sesMock.on(SendEmailCommand).resolves({ MessageId: 'message-1' });
            const service = new SESService({ client: new SESv2Client({}) });
            const input = {
                FromEmailAddress: 'sender@example.com',
                Destination: { ToAddresses: ['to@example.com'] },
                Content: {
                    Simple: {
                        Subject: { Data: 'Hello' },
                        Body: { Text: { Data: 'World' } },
                    },
                },
            };

            const output = await service.sendEmail(input);

            expect(output.MessageId).toBe('message-1');
            expect(sesMock.commandCalls(SendEmailCommand)[0]?.args[0].input).toEqual(input);
        });

        it('logs routing metadata and a recipient count, but no addresses or content, at INFO level', async () => {
            sesMock.on(SendEmailCommand).resolves({ MessageId: 'message-1' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SESService({ client: new SESv2Client({}), logger });

            await service.sendEmail({
                FromEmailAddress: 'sender@example.com',
                FromEmailAddressIdentityArn: 'arn:aws:ses:us-east-1:0:identity/example.com',
                ConfigurationSetName: 'transactional',
                EmailTags: [{ Name: 'campaign', Value: 'welcome' }],
                EndpointId: 'endpoint-1',
                TenantName: 'tenant-1',
                ReplyToAddresses: ['reply@example.com'],
                Destination: {
                    ToAddresses: ['to-1@example.com', 'to-2@example.com'],
                    CcAddresses: ['cc@example.com'],
                },
                Content: {
                    Simple: {
                        Subject: { Data: 'Order 1234 confirmed' },
                        Body: { Text: { Data: 'Dear Jane Citizen' } },
                    },
                },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).toEqual({
                FromEmailAddressIdentityArn: 'arn:aws:ses:us-east-1:0:identity/example.com',
                ConfigurationSetName: 'transactional',
                EmailTags: [{ Name: 'campaign', Value: 'welcome' }],
                EndpointId: 'endpoint-1',
                TenantName: 'tenant-1',
                recipientCount: 3,
            });
        });

        it.each([
            ['Bcc recipients', { BccAddresses: ['a@example.com', 'b@example.com'] }, 2],
            ['no Destination', undefined, 0],
        ])('logs the recipient count for %s', async (_, destination, expected) => {
            sesMock.on(SendEmailCommand).resolves({ MessageId: 'message-1' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SESService({ client: new SESv2Client({}), logger });

            await service.sendEmail({
                Destination: destination,
                Content: { Template: { TemplateName: 'welcome' } },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).toMatchObject({ recipientCount: expected });
        });

        it('logs the template name but not the template data at INFO level', async () => {
            sesMock.on(SendEmailCommand).resolves({ MessageId: 'message-1' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SESService({ client: new SESv2Client({}), logger });

            await service.sendEmail({
                Destination: { ToAddresses: ['to@example.com'] },
                Content: {
                    Template: {
                        TemplateName: 'order-confirmation',
                        TemplateData: '{"customer":"Jane Citizen"}',
                    },
                },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).toMatchObject({ templateName: 'order-confirmation' });
            expect(JSON.stringify(loggedInput)).not.toContain('Jane Citizen');
        });
    });

    describe('request-level failures', () => {
        it('propagates SDK exceptions from sendEmail unwrapped', async () => {
            const sdkError = new Error('Sending is paused');
            sesMock.on(SendEmailCommand).rejects(sdkError);
            const service = new SESService({ client: new SESv2Client({}) });

            await expect(
                service.sendEmail({ Content: { Template: { TemplateName: 'welcome' } } })
            ).rejects.toBe(sdkError);
        });

        it('propagates SDK exceptions from sendBulkEmail unwrapped', async () => {
            const sdkError = new Error('Sending is paused');
            sesMock.on(SendBulkEmailCommand).rejects(sdkError);
            const service = new SESService({ client: new SESv2Client({}) });

            await expect(
                service.sendBulkEmail({
                    DefaultContent: { Template: { TemplateName: 'welcome' } },
                    BulkEmailEntries: [{ Destination: { ToAddresses: ['to@example.com'] } }],
                })
            ).rejects.toBe(sdkError);
        });
    });

    describe('sendBulkEmail', () => {
        it('returns an empty array without sending when there are no entries', async () => {
            const service = new SESService({ client: new SESv2Client({}) });

            const results = await service.sendBulkEmail({
                DefaultContent: { Template: { TemplateName: 'welcome' } },
                BulkEmailEntries: [],
            });

            expect(results).toEqual([]);
            expect(sesMock.commandCalls(SendBulkEmailCommand)).toHaveLength(0);
        });

        it('returns an empty array without sending when BulkEmailEntries is undefined', async () => {
            const service = new SESService({ client: new SESv2Client({}) });

            const results = await service.sendBulkEmail({
                DefaultContent: { Template: { TemplateName: 'welcome' } },
                BulkEmailEntries: undefined,
            });

            expect(results).toEqual([]);
            expect(sesMock.commandCalls(SendBulkEmailCommand)).toHaveLength(0);
        });

        it('falls back to the status as the failure message when SES gives no error text', async () => {
            sesMock.on(SendBulkEmailCommand).resolves({
                BulkEmailEntryResults: [{ Status: 'TRANSIENT_FAILURE' }],
            });
            const service = new SESService({ client: new SESv2Client({}) });

            const error = await batchFailure(
                service.sendBulkEmail({
                    DefaultContent: { Template: { TemplateName: 'welcome' } },
                    BulkEmailEntries: [{ Destination: { ToAddresses: ['to@example.com'] } }],
                })
            );

            expect(error.failed).toEqual([
                { id: '0', code: 'TRANSIENT_FAILURE', message: 'TRANSIENT_FAILURE' },
            ]);
        });

        it('sends a single request when entries fit within the batch limit', async () => {
            sesMock.on(SendBulkEmailCommand).resolves({
                BulkEmailEntryResults: [{ Status: 'SUCCESS', MessageId: 'message-1' }],
            });
            const service = new SESService({ client: new SESv2Client({}) });
            const input = {
                FromEmailAddress: 'sender@example.com',
                ConfigurationSetName: 'transactional',
                DefaultContent: { Template: { TemplateName: 'order-confirmation' } },
                BulkEmailEntries: [{ Destination: { ToAddresses: ['to@example.com'] } }],
            };

            const results = await service.sendBulkEmail(input);

            expect(sesMock.commandCalls(SendBulkEmailCommand)).toHaveLength(1);
            expect(sesMock.commandCalls(SendBulkEmailCommand)[0]?.args[0].input).toEqual(input);
            expect(results).toEqual([
                { BulkEmailEntryResults: [{ Status: 'SUCCESS', MessageId: 'message-1' }] },
            ]);
        });

        it('chunks BulkEmailEntries into 50-entry requests that share the other fields', async () => {
            sesMock.on(SendBulkEmailCommand).callsFake((input: SendBulkEmailCommandInput) => ({
                BulkEmailEntryResults: input.BulkEmailEntries?.map(() => ({ Status: 'SUCCESS' })),
            }));
            const service = new SESService({ client: new SESv2Client({}) });
            const entries = Array.from({ length: 120 }, (_, i) => ({
                Destination: { ToAddresses: [`to-${i}@example.com`] },
            }));

            const results = await service.sendBulkEmail({
                FromEmailAddress: 'sender@example.com',
                ConfigurationSetName: 'transactional',
                DefaultContent: { Template: { TemplateName: 'order-confirmation' } },
                BulkEmailEntries: entries,
            });

            const sent = sesMock.commandCalls(SendBulkEmailCommand).map(c => c.args[0].input);
            expect(sent.map(input => input.BulkEmailEntries?.length)).toEqual([50, 50, 20]);
            expect(sent.flatMap(input => input.BulkEmailEntries ?? [])).toEqual(entries);
            for (const input of sent) {
                expect(input).toMatchObject({
                    FromEmailAddress: 'sender@example.com',
                    ConfigurationSetName: 'transactional',
                    DefaultContent: { Template: { TemplateName: 'order-confirmation' } },
                });
            }
            expect(results.map(r => r.BulkEmailEntryResults?.length)).toEqual([50, 50, 20]);
        });

        it('sends every chunk, then throws one BatchOperationError identifying failed entries by original index', async () => {
            sesMock.on(SendBulkEmailCommand).callsFake((input: SendBulkEmailCommandInput) => ({
                BulkEmailEntryResults: input.BulkEmailEntries?.map(entry => {
                    const [address] = entry.Destination?.ToAddresses ?? [];
                    if (address === 'to-60@example.com') {
                        return { Status: 'MESSAGE_REJECTED', Error: 'Address is suppressed' };
                    }
                    if (address === 'to-110@example.com') return {};
                    return { Status: 'SUCCESS', MessageId: 'ok' };
                }),
            }));
            const service = new SESService({ client: new SESv2Client({}) });

            const error = await batchFailure(
                service.sendBulkEmail({
                    DefaultContent: { Template: { TemplateName: 'order-confirmation' } },
                    BulkEmailEntries: Array.from({ length: 120 }, (_, i) => ({
                        Destination: { ToAddresses: [`to-${i}@example.com`] },
                    })),
                })
            );

            expect(sesMock.commandCalls(SendBulkEmailCommand)).toHaveLength(3);
            expect(error.results).toHaveLength(3);
            expect(error.failed).toEqual([
                { id: '60', code: 'MESSAGE_REJECTED', message: 'Address is suppressed' },
                { id: '110', code: undefined, message: 'No status returned for entry' },
            ]);
        });

        it('treats entries SES returned no result for as failed', async () => {
            sesMock
                .on(SendBulkEmailCommand)
                .resolvesOnce({
                    BulkEmailEntryResults: Array.from({ length: 49 }, () => ({
                        Status: 'SUCCESS' as const,
                    })),
                })
                .resolvesOnce({});
            const service = new SESService({ client: new SESv2Client({}) });

            const error = await batchFailure(
                service.sendBulkEmail({
                    DefaultContent: { Template: { TemplateName: 'order-confirmation' } },
                    BulkEmailEntries: Array.from({ length: 60 }, (_, i) => ({
                        Destination: { ToAddresses: [`to-${i}@example.com`] },
                    })),
                })
            );

            expect(error.failed.map(entry => entry.id)).toEqual([
                '49',
                ...Array.from({ length: 10 }, (_, i) => String(50 + i)),
            ]);
            expect(error.failed).toContainEqual({
                id: '49',
                code: undefined,
                message: 'No status returned for entry',
            });
        });

        it('logs routing metadata, the template name and an entry count, but no destinations or template data, at INFO level', async () => {
            sesMock.on(SendBulkEmailCommand).resolves({
                BulkEmailEntryResults: [{ Status: 'SUCCESS' }, { Status: 'SUCCESS' }],
            });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SESService({ client: new SESv2Client({}), logger });

            await service.sendBulkEmail({
                FromEmailAddress: 'sender@example.com',
                FromEmailAddressIdentityArn: 'arn:aws:ses:us-east-1:0:identity/example.com',
                ReplyToAddresses: ['reply@example.com'],
                ConfigurationSetName: 'transactional',
                DefaultEmailTags: [{ Name: 'campaign', Value: 'welcome' }],
                EndpointId: 'endpoint-1',
                TenantName: 'tenant-1',
                DefaultContent: {
                    Template: {
                        TemplateName: 'order-confirmation',
                        TemplateData: '{"customer":"Jane Citizen"}',
                    },
                },
                BulkEmailEntries: [
                    { Destination: { ToAddresses: ['to-1@example.com'] } },
                    { Destination: { ToAddresses: ['to-2@example.com'] } },
                ],
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedInput = (payload as { input: object }).input;
            expect(loggedInput).toEqual({
                FromEmailAddressIdentityArn: 'arn:aws:ses:us-east-1:0:identity/example.com',
                ConfigurationSetName: 'transactional',
                DefaultEmailTags: [{ Name: 'campaign', Value: 'welcome' }],
                EndpointId: 'endpoint-1',
                TenantName: 'tenant-1',
                templateName: 'order-confirmation',
                entryCount: 2,
            });
        });
    });
});
