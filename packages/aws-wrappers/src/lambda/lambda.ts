import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    InvokeCommand,
    InvokeCommandInput,
    InvokeCommandOutput,
    LambdaClient,
} from '@aws-sdk/client-lambda';
import xray from 'aws-xray-sdk-core';
import { LambdaFunctionError, parseFunctionErrorPayload } from '../util/lambda-function-error.js';
import { redactInput } from '../util/redact.js';

/**
 * `Invoke` inputs carry the invocation `Payload` and the base64 `ClientContext`
 * handed to the function, both of which routinely contain caller data and PII.
 * Everything else identifies the target or how to call it.
 */
const INVOKE_SAFE_FIELDS: ReadonlyArray<keyof InvokeCommandInput> = [
    'FunctionName',
    'InvocationType',
    'Qualifier',
    'LogType',
    'TenantId',
];

/**
 * Wrapper around the AWS Lambda client providing structured Powertools logging
 * and X-Ray tracing by default.
 *
 * Where a method's input carries payloads, secret material or PII, the INFO
 * log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
 * `TRACE`) log full SDK inputs.
 *
 * Covers `invoke` only.
 */
export class LambdaService {
    private readonly client: LambdaClient;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `LambdaClient`. When
     * supplied, the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: LambdaClient }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new LambdaClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Invoke a Lambda function. The input is the SDK input unchanged and the
     * output is the SDK output unchanged: `Payload` stays a `Uint8Array` you
     * decode yourself. Choose synchronous, asynchronous or dry-run invocation
     * with `InvocationType`; omitting it means synchronous (`RequestResponse`).
     *
     * Lambda answers HTTP 200 even when the invoked function threw, flagging it
     * with `FunctionError` on the response. If that marker is present this
     * method warns and throws a {@link LambdaFunctionError} carrying the
     * function name, the marker, and the error type and message parsed from the
     * payload when it has the usual JSON shape. The raw output and the stack
     * trace are deliberately left off the error.
     *
     * The marker only appears on synchronous responses, so the check is
     * unconditional: asynchronous (`Event`) and `DryRun` responses return
     * without throwing. Failures of asynchronous invocations are therefore not
     * observable here; they belong to dead-letter queues and destinations on
     * the invoked function. No status code check is added; service-level
     * errors such as throttling are thrown by the SDK and propagate unwrapped.
     *
     * At INFO level the log line includes only the function name, invocation
     * type, qualifier, log type and tenant id. `Payload` and `ClientContext` are
     * omitted, and responses are never logged.
     *
     * @param input - InvokeCommandInput including FunctionName.
     */
    async invoke(input: InvokeCommandInput): Promise<InvokeCommandOutput> {
        this.logger.info('Invoking Lambda function', {
            input: redactInput(this.logger, input, INVOKE_SAFE_FIELDS),
        });
        const output = await this.client.send(new InvokeCommand(input));
        if (output.FunctionError === undefined) return output;

        this.logger.warn('Lambda invoke function error', {
            functionName: input.FunctionName,
            functionError: output.FunctionError,
        });
        throw new LambdaFunctionError(
            input.FunctionName,
            output.FunctionError,
            parseFunctionErrorPayload(output.Payload)
        );
    }
}
