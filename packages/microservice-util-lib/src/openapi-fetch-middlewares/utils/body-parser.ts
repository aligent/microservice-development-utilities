/**
 * Parse request/response body based on Content-Type header
 */
export async function parseBody(
    source: Request | Response,
    contentType: string | null
): Promise<unknown> {
    const normalizedContentType = contentType ? contentType.toLowerCase() : 'application/json';

    try {
        if (!source.body) {
            return 'null';
        }

        // JSON content
        if (normalizedContentType.includes('application/json')) {
            return await source.json();
        }

        // Text content
        if (
            normalizedContentType.includes('text/') ||
            normalizedContentType.includes('application/xml') ||
            normalizedContentType.includes('application/x-www-form-urlencoded')
        ) {
            return await source.text();
        }

        // Binary or multipart content - don't parse
        if (
            normalizedContentType.includes('multipart/form-data') ||
            normalizedContentType.includes('application/octet-stream') ||
            normalizedContentType.includes('image/') ||
            normalizedContentType.includes('video/') ||
            normalizedContentType.includes('audio/')
        ) {
            return `[Binary content: ${contentType}]`;
        }

        // Unknown content type, try TEXT as default
        return await source.text();
    } catch (error) {
        return `[Unable to parse ${contentType} body: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
}
