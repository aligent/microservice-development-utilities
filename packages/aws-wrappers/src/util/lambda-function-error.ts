/**
 * Thrown by `LambdaService.invoke` when a synchronous invocation reached the
 * function but the function itself failed. Lambda reports that as an HTTP 200
 * carrying a function error marker, so the SDK does not throw.
 *
 * `functionError` is the SDK's marker (`Handled` or `Unhandled`).
 * `errorType` and `errorMessage` are parsed from the response payload when it
 * has the usual `{ errorType, errorMessage }` JSON shape, otherwise undefined.
 *
 * Deliberately excludes the raw SDK output and the stack trace: either can
 * contain the caller's payload or PII.
 *
 * Match on `name` rather than `instanceof` if both the CJS and ESM builds of
 * this package may be loaded in one process.
 */
export class LambdaFunctionError extends Error {
    override readonly name = 'LambdaFunctionError';

    constructor(
        readonly functionName: string | undefined,
        readonly functionError: string,
        readonly errorType: string | undefined,
        readonly errorMessage: string | undefined
    ) {
        super(`Lambda function ${functionName ?? '(unnamed)'} failed (${functionError})`);
    }
}

interface ParsedErrorPayload {
    errorType: string | undefined;
    errorMessage: string | undefined;
}

/**
 * Reads `errorType` and `errorMessage` out of a function error payload.
 * Anything that is not a JSON object with string fields yields undefined for
 * that field rather than failing, because the payload is whatever the invoked
 * function (or runtime) chose to return.
 */
export function parseFunctionErrorPayload(payload: Uint8Array | undefined): ParsedErrorPayload {
    const empty: ParsedErrorPayload = { errorType: undefined, errorMessage: undefined };
    if (payload === undefined) return empty;

    let parsed: unknown;
    try {
        parsed = JSON.parse(new TextDecoder().decode(payload));
    } catch {
        return empty;
    }
    if (typeof parsed !== 'object' || parsed === null) return empty;

    const { errorType, errorMessage } = parsed as Record<string, unknown>;
    return {
        errorType: typeof errorType === 'string' ? errorType : undefined,
        errorMessage: typeof errorMessage === 'string' ? errorMessage : undefined,
    };
}
