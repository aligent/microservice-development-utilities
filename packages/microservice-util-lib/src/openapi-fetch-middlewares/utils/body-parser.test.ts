import { parseBody } from './body-parser';

describe('parseBody', () => {
    describe('JSON content', () => {
        it('should parse application/json body', async () => {
            const body = { key: 'value' };
            const response = new Response(JSON.stringify(body), {
                headers: { 'Content-Type': 'application/json' },
            });

            const result = await parseBody(response, 'application/json');

            expect(result).toEqual(body);
        });

        it('should parse application/json with charset', async () => {
            const body = { key: 'value' };
            const response = new Response(JSON.stringify(body), {
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            });

            const result = await parseBody(response, 'application/json; charset=utf-8');

            expect(result).toEqual(body);
        });

        it('should default to application/json when contentType is null', async () => {
            const body = { key: 'value' };
            const response = new Response(JSON.stringify(body));

            const result = await parseBody(response, null);

            expect(result).toEqual(body);
        });
    });

    describe('text content', () => {
        it('should parse text/plain body', async () => {
            const response = new Response('hello world', {
                headers: { 'Content-Type': 'text/plain' },
            });

            const result = await parseBody(response, 'text/plain');

            expect(result).toBe('hello world');
        });

        it('should parse text/html body', async () => {
            const html = '<html><body>test</body></html>';
            const response = new Response(html, {
                headers: { 'Content-Type': 'text/html' },
            });

            const result = await parseBody(response, 'text/html');

            expect(result).toBe(html);
        });

        it('should parse application/xml body', async () => {
            const xml = '<root><item>test</item></root>';
            const response = new Response(xml, {
                headers: { 'Content-Type': 'application/xml' },
            });

            const result = await parseBody(response, 'application/xml');

            expect(result).toBe(xml);
        });

        it('should parse application/x-www-form-urlencoded body', async () => {
            const form = 'key=value&foo=bar';
            const response = new Response(form, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const result = await parseBody(response, 'application/x-www-form-urlencoded');

            expect(result).toBe(form);
        });
    });

    describe('binary content', () => {
        it('should return placeholder for multipart/form-data', async () => {
            const response = new Response('binary data', {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const result = await parseBody(response, 'multipart/form-data');

            expect(result).toBe('[Binary content: multipart/form-data]');
        });

        it('should return placeholder for application/octet-stream', async () => {
            const response = new Response('binary', {
                headers: { 'Content-Type': 'application/octet-stream' },
            });

            const result = await parseBody(response, 'application/octet-stream');

            expect(result).toBe('[Binary content: application/octet-stream]');
        });

        it('should return placeholder for image content types', async () => {
            const response = new Response('image data', {
                headers: { 'Content-Type': 'image/png' },
            });

            const result = await parseBody(response, 'image/png');

            expect(result).toBe('[Binary content: image/png]');
        });

        it('should return placeholder for video content types', async () => {
            const response = new Response('video data', {
                headers: { 'Content-Type': 'video/mp4' },
            });

            const result = await parseBody(response, 'video/mp4');

            expect(result).toBe('[Binary content: video/mp4]');
        });

        it('should return placeholder for audio content types', async () => {
            const response = new Response('audio data', {
                headers: { 'Content-Type': 'audio/mpeg' },
            });

            const result = await parseBody(response, 'audio/mpeg');

            expect(result).toBe('[Binary content: audio/mpeg]');
        });
    });

    describe('empty body', () => {
        it('should return "null" when body is null', async () => {
            const response = new Response(null);

            const result = await parseBody(response, 'application/json');

            expect(result).toBe('null');
        });
    });

    describe('unknown content type', () => {
        it('should fall back to text for unknown content types', async () => {
            const content = 'some unknown content';
            const response = new Response(content, {
                headers: { 'Content-Type': 'application/vnd.custom' },
            });

            const result = await parseBody(response, 'application/vnd.custom');

            expect(result).toBe(content);
        });
    });

    describe('error handling', () => {
        it('should return error message when parsing fails', async () => {
            const response = new Response('not json', {
                headers: { 'Content-Type': 'application/json' },
            });
            // Consume the body so .json() will fail
            await response.text();

            const result = await parseBody(response, 'application/json');

            expect(result).toMatch(/\[Unable to parse application\/json body:/);
        });
    });

    describe('case insensitivity', () => {
        it('should handle uppercase content-type', async () => {
            const body = { key: 'value' };
            const response = new Response(JSON.stringify(body));

            const result = await parseBody(response, 'APPLICATION/JSON');

            expect(result).toEqual(body);
        });
    });
});
