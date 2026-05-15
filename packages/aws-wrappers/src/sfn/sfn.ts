import { Logger } from '@aws-lambda-powertools/logger';
import {
    DescribeExecutionCommand,
    DescribeExecutionCommandInput,
    DescribeExecutionCommandOutput,
    ExecutionListItem,
    ListExecutionsCommandInput,
    paginateListExecutions,
    SFNClient,
    StartExecutionCommand,
    StartExecutionCommandInput,
    StartExecutionCommandOutput,
    StopExecutionCommand,
    StopExecutionCommandInput,
    StopExecutionCommandOutput,
} from '@aws-sdk/client-sfn';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { filterFieldsForLogLevel } from '../util/redact';

/**
 * Fields safe to log at INFO for `startExecution`. Omits `input` — the SFN
 * execution payload, which routinely carries PII (customer IDs, addresses,
 * order contents, etc.). `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full input.
 */
const START_EXECUTION_SAFE_FIELDS: ReadonlyArray<keyof StartExecutionCommandInput> = [
    'stateMachineArn',
    'name',
    'traceHeader',
];

/**
 * Wrapper around the AWS Step Functions client providing structured
 * Powertools logging and X-Ray tracing by default.
 */
export class StepFunctionsService {
    private readonly client: SFNClient;
    private readonly logger: Logger;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SFNClient`. When supplied,
     * the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: Logger; client?: SFNClient }) {
        this.client = opts?.client ?? captureAWSv3Client(new SFNClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * List all executions for a state machine, auto-paginating across all
     * pages. Typically bounded by `statusFilter` and state-machine retention,
     * so the flat-array shape is safe in practice.
     */
    async listExecutions(input: ListExecutionsCommandInput): Promise<ExecutionListItem[]> {
        this.logger.info('Listing Step Functions executions', { input });
        const paginator = paginateListExecutions({ client: this.client }, input);
        const executions: ExecutionListItem[] = [];
        for await (const page of paginator) {
            if (page.executions) executions.push(...page.executions);
        }
        return executions;
    }

    /**
     * Start a new Step Functions execution.
     */
    async startExecution(input: StartExecutionCommandInput): Promise<StartExecutionCommandOutput> {
        this.logger.info('Starting Step Functions execution', {
            input: filterFieldsForLogLevel(this.logger, input, START_EXECUTION_SAFE_FIELDS),
        });
        return this.client.send(new StartExecutionCommand(input));
    }

    /**
     * Describe an existing Step Functions execution.
     */
    async describeExecution(
        input: DescribeExecutionCommandInput
    ): Promise<DescribeExecutionCommandOutput> {
        this.logger.info('Describing Step Functions execution', { input });
        return this.client.send(new DescribeExecutionCommand(input));
    }

    /**
     * Stop an in-progress Step Functions execution.
     */
    async stopExecution(input: StopExecutionCommandInput): Promise<StopExecutionCommandOutput> {
        this.logger.info('Stopping Step Functions execution', { input });
        return this.client.send(new StopExecutionCommand(input));
    }
}
