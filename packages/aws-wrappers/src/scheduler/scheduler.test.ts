import { Logger } from '@aws-lambda-powertools/logger';
import {
    CreateScheduleCommand,
    CreateScheduleGroupCommand,
    DeleteScheduleCommand,
    DeleteScheduleGroupCommand,
    GetScheduleCommand,
    GetScheduleGroupCommand,
    ListScheduleGroupsCommand,
    ListSchedulesCommand,
    SchedulerClient,
    UpdateScheduleCommand,
} from '@aws-sdk/client-scheduler';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SchedulerService } from './scheduler';

const schedulerMock = mockClient(SchedulerClient);

const target = {
    Arn: 'arn:aws:lambda:us-east-1:0:function:test',
    RoleArn: 'arn:aws:iam::0:role/test',
};

describe('SchedulerService', () => {
    afterEach(() => {
        schedulerMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new SchedulerService()).not.toThrow();
    });

    describe('listSchedules', () => {
        it('concatenates schedules across pages', async () => {
            schedulerMock
                .on(ListSchedulesCommand)
                .resolvesOnce({ Schedules: [{ Name: 's1' }], NextToken: 'tok' })
                .resolves({ Schedules: [{ Name: 's2' }] });

            const service = new SchedulerService({ client: new SchedulerClient({}) });

            const result = await service.listSchedules({ GroupName: 'default' });

            expect(result.map(s => s.Name)).toEqual(['s1', 's2']);
            expect(schedulerMock.commandCalls(ListSchedulesCommand)).toHaveLength(2);
        });

        it('returns an empty array when no schedules exist', async () => {
            schedulerMock.on(ListSchedulesCommand).resolves({});
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await expect(service.listSchedules()).resolves.toEqual([]);
        });
    });

    describe('listScheduleGroups', () => {
        it('concatenates groups across pages', async () => {
            schedulerMock
                .on(ListScheduleGroupsCommand)
                .resolvesOnce({ ScheduleGroups: [{ Name: 'g1' }], NextToken: 'tok' })
                .resolves({ ScheduleGroups: [{ Name: 'g2' }] });

            const service = new SchedulerService({ client: new SchedulerClient({}) });

            const result = await service.listScheduleGroups();

            expect(result.map(g => g.Name)).toEqual(['g1', 'g2']);
            expect(schedulerMock.commandCalls(ListScheduleGroupsCommand)).toHaveLength(2);
        });

        it('returns an empty array when no groups exist', async () => {
            schedulerMock.on(ListScheduleGroupsCommand).resolves({});
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await expect(service.listScheduleGroups()).resolves.toEqual([]);
        });
    });

    describe('createSchedule', () => {
        it('sends a CreateScheduleCommand', async () => {
            schedulerMock.on(CreateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.createSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(1 day)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: target,
            });

            expect(schedulerMock.commandCalls(CreateScheduleCommand)).toHaveLength(1);
        });

        it('omits Target.Input from the INFO log but keeps the rest of Target', async () => {
            schedulerMock.on(CreateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SchedulerService({ client: new SchedulerClient({}), logger });

            await service.createSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(1 day)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: {
                    ...target,
                    Input: JSON.stringify({ customerEmail: 'pii@example.com' }),
                },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedTarget = (payload as { input: { Target: object } }).input.Target;
            expect(loggedTarget).not.toHaveProperty('Input');
            expect(loggedTarget).toHaveProperty('Arn', target.Arn);
        });

        it('logs Target.Input at DEBUG level', async () => {
            schedulerMock.on(CreateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const logger = new Logger();
            logger.setLogLevel('DEBUG');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SchedulerService({ client: new SchedulerClient({}), logger });

            await service.createSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(1 day)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: { ...target, Input: 'payload' },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedTarget = (payload as { input: { Target: object } }).input.Target;
            expect(loggedTarget).toHaveProperty('Input', 'payload');
        });

        it('leaves the input untouched when the Target has no Input', async () => {
            schedulerMock.on(CreateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SchedulerService({ client: new SchedulerClient({}), logger });

            await service.createSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(1 day)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: target,
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedTarget = (payload as { input: { Target: object } }).input.Target;
            expect(loggedTarget).toEqual(target);
        });
    });

    describe('updateSchedule', () => {
        it('omits Target.Input from the INFO log but keeps the rest of Target', async () => {
            schedulerMock.on(UpdateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const logger = new Logger();
            logger.setLogLevel('INFO');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SchedulerService({ client: new SchedulerClient({}), logger });

            await service.updateSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(2 days)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: {
                    ...target,
                    Input: JSON.stringify({ customerEmail: 'pii@example.com' }),
                },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedTarget = (payload as { input: { Target: object } }).input.Target;
            expect(loggedTarget).not.toHaveProperty('Input');
            expect(loggedTarget).toHaveProperty('Arn', target.Arn);
        });

        it('logs Target.Input at DEBUG level', async () => {
            schedulerMock.on(UpdateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const logger = new Logger();
            logger.setLogLevel('DEBUG');
            const infoSpy = vi.spyOn(logger, 'info');
            const service = new SchedulerService({ client: new SchedulerClient({}), logger });

            await service.updateSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(2 days)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: { ...target, Input: 'payload' },
            });

            const [, payload] = infoSpy.mock.calls[0] ?? [];
            const loggedTarget = (payload as { input: { Target: object } }).input.Target;
            expect(loggedTarget).toHaveProperty('Input', 'payload');
        });
    });

    describe('pass-through commands', () => {
        it('getSchedule sends a GetScheduleCommand', async () => {
            schedulerMock.on(GetScheduleCommand).resolves({});
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.getSchedule({ Name: 's1' });

            expect(schedulerMock.commandCalls(GetScheduleCommand)).toHaveLength(1);
        });

        it('updateSchedule sends an UpdateScheduleCommand', async () => {
            schedulerMock.on(UpdateScheduleCommand).resolves({ ScheduleArn: 'arn-1' });
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.updateSchedule({
                Name: 's1',
                ScheduleExpression: 'rate(2 days)',
                FlexibleTimeWindow: { Mode: 'OFF' },
                Target: target,
            });

            expect(schedulerMock.commandCalls(UpdateScheduleCommand)).toHaveLength(1);
        });

        it('deleteSchedule sends a DeleteScheduleCommand', async () => {
            schedulerMock.on(DeleteScheduleCommand).resolves({});
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.deleteSchedule({ Name: 's1' });

            expect(schedulerMock.commandCalls(DeleteScheduleCommand)).toHaveLength(1);
        });

        it('createScheduleGroup sends a CreateScheduleGroupCommand', async () => {
            schedulerMock.on(CreateScheduleGroupCommand).resolves({ ScheduleGroupArn: 'arn-1' });
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.createScheduleGroup({ Name: 'g1' });

            expect(schedulerMock.commandCalls(CreateScheduleGroupCommand)).toHaveLength(1);
        });

        it('getScheduleGroup sends a GetScheduleGroupCommand', async () => {
            schedulerMock.on(GetScheduleGroupCommand).resolves({});
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.getScheduleGroup({ Name: 'g1' });

            expect(schedulerMock.commandCalls(GetScheduleGroupCommand)).toHaveLength(1);
        });

        it('deleteScheduleGroup sends a DeleteScheduleGroupCommand', async () => {
            schedulerMock.on(DeleteScheduleGroupCommand).resolves({});
            const service = new SchedulerService({ client: new SchedulerClient({}) });

            await service.deleteScheduleGroup({ Name: 'g1' });

            expect(schedulerMock.commandCalls(DeleteScheduleGroupCommand)).toHaveLength(1);
        });
    });
});
