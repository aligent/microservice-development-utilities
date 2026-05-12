import {
    DescribeExecutionCommand,
    ListExecutionsCommand,
    SFNClient,
    StartExecutionCommand,
    StopExecutionCommand,
} from '@aws-sdk/client-sfn';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, describe, expect, it } from 'vitest';
import { StepFunctionsService } from './sfn';

const sfnMock = mockClient(SFNClient);
const stateMachineArn = 'arn:aws:states:us-east-1:0:stateMachine:test';

describe('StepFunctionsService', () => {
    afterEach(() => {
        sfnMock.reset();
    });

    it('constructs with default logger and client when no options supplied', () => {
        expect(() => new StepFunctionsService()).not.toThrow();
    });

    describe('listExecutions', () => {
        it('concatenates executions across pages', async () => {
            sfnMock
                .on(ListExecutionsCommand)
                .resolvesOnce({
                    executions: [
                        {
                            executionArn: 'arn-1',
                            stateMachineArn,
                            name: 'e1',
                            status: 'RUNNING',
                            startDate: new Date(),
                        },
                    ],
                    nextToken: 'tok',
                })
                .resolves({
                    executions: [
                        {
                            executionArn: 'arn-2',
                            stateMachineArn,
                            name: 'e2',
                            status: 'SUCCEEDED',
                            startDate: new Date(),
                        },
                    ],
                });

            const service = new StepFunctionsService({ client: new SFNClient({}) });

            const result = await service.listExecutions({ stateMachineArn });

            expect(result.map(e => e.executionArn)).toEqual(['arn-1', 'arn-2']);
            expect(sfnMock.commandCalls(ListExecutionsCommand)).toHaveLength(2);
        });

        it('returns an empty array when no executions exist', async () => {
            sfnMock.on(ListExecutionsCommand).resolves({});
            const service = new StepFunctionsService({ client: new SFNClient({}) });

            await expect(service.listExecutions({ stateMachineArn })).resolves.toEqual([]);
        });
    });

    describe('pass-through commands', () => {
        it('startExecution sends a StartExecutionCommand', async () => {
            sfnMock.on(StartExecutionCommand).resolves({ executionArn: 'arn-1' });
            const service = new StepFunctionsService({ client: new SFNClient({}) });

            await service.startExecution({ stateMachineArn, input: '{}' });

            expect(sfnMock.commandCalls(StartExecutionCommand)).toHaveLength(1);
        });

        it('describeExecution sends a DescribeExecutionCommand', async () => {
            sfnMock.on(DescribeExecutionCommand).resolves({});
            const service = new StepFunctionsService({ client: new SFNClient({}) });

            await service.describeExecution({ executionArn: 'arn-1' });

            expect(sfnMock.commandCalls(DescribeExecutionCommand)).toHaveLength(1);
        });

        it('stopExecution sends a StopExecutionCommand', async () => {
            sfnMock.on(StopExecutionCommand).resolves({});
            const service = new StepFunctionsService({ client: new SFNClient({}) });

            await service.stopExecution({ executionArn: 'arn-1' });

            expect(sfnMock.commandCalls(StopExecutionCommand)).toHaveLength(1);
        });
    });
});
