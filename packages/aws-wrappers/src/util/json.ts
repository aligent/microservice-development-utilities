/**
 * `JSON.parse` that never leaks the parsed text. V8's `SyntaxError` message
 * embeds a snippet of the input (`Unexpected token 'h', ..."assword": hunter2}"
 * is not valid JSON`), and the wrappers parse secrets and stored objects, so
 * letting it through would put that content into the caller's error logs.
 *
 * The original error is deliberately not attached as `cause`: loggers serialise
 * `cause` and its message carries the snippet. `context` should identify the
 * source (a secret id, a bucket and key) so the failure is still diagnosable.
 *
 * @throws An `Error` naming `context`, without any of the input text.
 */
export function parseJson<T>(text: string, context: string): T {
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`${context} does not contain valid JSON`);
    }
}
