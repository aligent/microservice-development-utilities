/**
 * Runtime code to enable the `stepFunctionExecutionId` logging.
 * This is bundled into each Lambda handler, so it must only depend on Node.js built-ins.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface StepFunctionLogKeys {
    /** ID of the execution that invoked this Lambda */
    stepFunctionExecutionId: string;
    /** ID of the top-level execution — equal to `stepFunctionExecutionId` unless the state machine passes one down */
    rootStepFunctionExecutionId: string;
}

type LogMethod = (input: unknown, ...extraInput: unknown[]) => void;

const LOG_METHODS = ['trace', 'debug', 'info', 'warn', 'error', 'critical'] as const;
const PATCHED = Symbol.for('@aligent/vite-plugin-handler/step-function-context');

const store = new AsyncLocalStorage<StepFunctionLogKeys>();

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * Reads the Step Functions execution IDs from the Lambda ClientContext.
 *
 * The Node.js runtime passes the decoded ClientContext JSON through as-is, so the
 * state machine's `{"custom": {...}}` arrives as `context.clientContext.custom`.
 */
export function extractStepFunctionLogKeys(context: unknown): StepFunctionLogKeys | undefined {
    if (!isRecord(context) || !isRecord(context['clientContext'])) {
        return undefined;
    }

    const custom = context['clientContext']['custom'];
    if (!isRecord(custom)) {
        return undefined;
    }

    const executionId = custom['stepFunctionExecutionId'];
    if (typeof executionId !== 'string' || !executionId) {
        return undefined;
    }

    const rootExecutionId = custom['rootStepFunctionExecutionId'];

    return {
        stepFunctionExecutionId: executionId,
        rootStepFunctionExecutionId:
            typeof rootExecutionId === 'string' && rootExecutionId ? rootExecutionId : executionId,
    };
}

/** Returns the execution IDs for the invocation currently running, if it came from Step Functions */
export function getStepFunctionLogKeys(): StepFunctionLogKeys | undefined {
    return store.getStore();
}

/**
 * Wraps a Lambda handler so the Step Functions execution IDs from its ClientContext
 * are available to {@link getStepFunctionLogKeys} for the whole invocation.
 *
 * Uses AsyncLocalStorage instead of module state so concurrent invocations in the
 * same environment never see each other's IDs.
 */
export function wrapHandler<T>(handler: T): T {
    if (typeof handler !== 'function') {
        return handler;
    }

    const wrapped = function (this: unknown, event: unknown, context: unknown, ...rest: unknown[]) {
        const keys = extractStepFunctionLogKeys(context);
        const invoke = () => handler.call(this, event, context, ...rest);
        return keys ? store.run(keys, invoke) : invoke();
    };

    return wrapped as T;
}

/**
 * Patches the Powertools `Logger` class so every log line written during a
 * Step Functions invocation carries the execution IDs.
 *
 * Uses only the public log methods: the IDs are passed as the first extra input
 * object, which Powertools merges into the log attributes. Anything the caller
 * passes afterwards takes precedence. Patching is idempotent per class.
 */
export function patchPowertoolsLogger(LoggerClass: unknown): void {
    if (typeof LoggerClass !== 'function' || !isRecord(LoggerClass.prototype)) {
        return;
    }

    const prototype: Record<PropertyKey, unknown> = LoggerClass.prototype;
    if (prototype[PATCHED]) {
        return;
    }

    for (const method of LOG_METHODS) {
        const original = prototype[method];
        if (typeof original !== 'function') {
            continue;
        }

        prototype[method] = function (this: unknown, input: unknown, ...extraInput: unknown[]) {
            const keys = store.getStore();
            return keys
                ? (original as LogMethod).call(this, input, keys, ...extraInput)
                : (original as LogMethod).call(this, input, ...extraInput);
        };
    }

    prototype[PATCHED] = true;
}
