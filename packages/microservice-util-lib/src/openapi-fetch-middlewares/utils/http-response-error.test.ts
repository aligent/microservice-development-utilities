import { HttpResponseError, isHttpResponseError } from './http-response-error';

describe('HttpResponseError', () => {
    const createTestRequest = (options?: { body?: string; contentType?: string }): Request => {
        const headers: Record<string, string> = {};
        if (options?.contentType) {
            headers['Content-Type'] = options.contentType;
        }
        return new Request('https://api.example.com/test?foo=bar&baz=qux', {
            method: 'POST',
            headers,
            body: options?.body ?? JSON.stringify({ request: 'data' }),
        });
    };

    const createTestResponse = (
        status: number,
        statusText: string,
        body?: string,
        contentType = 'application/json'
    ): Response => {
        return new Response(body ?? JSON.stringify({ error: 'something went wrong' }), {
            status,
            statusText,
            headers: { 'Content-Type': contentType },
        });
    };

    describe('create', () => {
        it('should create an error with correct status and message', async () => {
            const request = createTestRequest({ contentType: 'application/json' });
            const response = createTestResponse(404, 'Not Found');

            const error = await HttpResponseError.create(response, request);

            expect(error).toBeInstanceOf(HttpResponseError);
            expect(error).toBeInstanceOf(Error);
            expect(error.status).toBe(404);
            expect(error.statusText).toBe('Not Found');
            expect(error.message).toBe('404: Not Found');
            expect(error.name).toBe('HttpResponseError');
        });

        it('should capture request data', async () => {
            const request = createTestRequest({ contentType: 'application/json' });
            const response = createTestResponse(500, 'Internal Server Error');

            const error = await HttpResponseError.create(response, request);

            expect(error.request.method).toBe('POST');
            expect(error.request.url).toBe('https://api.example.com/test?foo=bar&baz=qux');
            expect(error.request.params).toEqual({ foo: 'bar', baz: 'qux' });
        });

        it('should capture response data', async () => {
            const response = createTestResponse(
                502,
                'Bad Gateway',
                JSON.stringify({ error: 'upstream' })
            );
            const request = createTestRequest({ contentType: 'application/json' });

            const error = await HttpResponseError.create(response, request);

            expect(error.response.status).toBe(502);
            expect(error.response.statusText).toBe('Bad Gateway');
            expect(error.response.headers['content-type']).toBe('application/json');
        });

        it('should handle request with already-consumed body', async () => {
            const request = createTestRequest({ contentType: 'application/json' });
            await request.text(); // consume the body
            const response = createTestResponse(400, 'Bad Request');

            const error = await HttpResponseError.create(response, request);

            expect(error.request.body).toBeNull();
        });

        it('should handle response with already-consumed body', async () => {
            const response = createTestResponse(400, 'Bad Request');
            await response.text(); // consume the body
            const request = createTestRequest({ contentType: 'application/json' });

            const error = await HttpResponseError.create(response, request);

            expect(error.response.body).toBeNull();
        });

        it('should set isHttpResponseError flag', async () => {
            const request = createTestRequest({ contentType: 'application/json' });
            const response = createTestResponse(500, 'Internal Server Error');

            const error = await HttpResponseError.create(response, request);

            expect(error.isHttpResponseError).toBe(true);
        });
    });

    describe('toJson', () => {
        it('should return a serializable representation', async () => {
            const request = createTestRequest({ contentType: 'application/json' });
            const response = createTestResponse(422, 'Unprocessable Entity');

            const error = await HttpResponseError.create(response, request);
            const json = error.toJson();

            expect(json).toEqual({
                name: 'HttpResponseError',
                message: '422: Unprocessable Entity',
                status: 422,
                statusText: 'Unprocessable Entity',
                request: error.request,
                response: error.response,
            });
        });
    });
});

describe('isHttpResponseError', () => {
    it('should return true for HttpResponseError instances', async () => {
        const request = new Request('https://api.example.com/test', { method: 'GET' });
        const response = new Response('error', {
            status: 500,
            statusText: 'Internal Server Error',
        });

        const error = await HttpResponseError.create(response, request);

        expect(isHttpResponseError(error)).toBe(true);
    });

    it('should return true for duck-typed objects with isHttpResponseError flag', () => {
        const fakeLike = { isHttpResponseError: true, message: 'fake' };

        expect(isHttpResponseError(fakeLike)).toBe(true);
    });

    it('should return false for regular errors', () => {
        expect(isHttpResponseError(new Error('regular error'))).toBe(false);
    });

    it('should return false for null', () => {
        expect(isHttpResponseError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
        expect(isHttpResponseError(undefined)).toBe(false);
    });

    it('should return false for non-error objects', () => {
        expect(isHttpResponseError({ message: 'not an error' })).toBe(false);
    });

    it('should return false for objects with isHttpResponseError set to false', () => {
        expect(isHttpResponseError({ isHttpResponseError: false })).toBe(false);
    });

    describe('with isBody validator', () => {
        interface ApiError {
            code: string;
        }

        const isApiError = (body: unknown): body is ApiError =>
            typeof body === 'object' && body !== null && 'code' in body;

        it('should return true when the body passes the validator', async () => {
            const request = new Request('https://api.example.com/test', { method: 'GET' });
            const response = new Response(JSON.stringify({ code: 'ERR_1' }), {
                status: 500,
                statusText: 'Internal Server Error',
                headers: { 'Content-Type': 'application/json' },
            });

            const error = await HttpResponseError.create<ApiError>(response, request);

            expect(isHttpResponseError<ApiError>(error, isApiError)).toBe(true);
        });

        it('should return false when the body fails the validator', async () => {
            const request = new Request('https://api.example.com/test', { method: 'GET' });
            const response = new Response(null, {
                status: 401,
                statusText: 'Unauthorized',
            });

            const error = await HttpResponseError.create<ApiError>(response, request);

            expect(isHttpResponseError<ApiError>(error, isApiError)).toBe(false);
        });

        it('should return false when body is missing on a duck-typed error', () => {
            const fakeLike = { isHttpResponseError: true, message: 'fake' };

            expect(isHttpResponseError<ApiError>(fakeLike, isApiError)).toBe(false);
        });

        it('should validate the body of a duck-typed error with a matching response.body', () => {
            const fakeLike = {
                isHttpResponseError: true,
                response: { body: { code: 'ERR_1' } },
            };

            expect(isHttpResponseError<ApiError>(fakeLike, isApiError)).toBe(true);
        });

        it('should return false for a duck-typed error whose response is not an object', () => {
            const fakeLike = { isHttpResponseError: true, response: 'not-an-object' };

            expect(isHttpResponseError<ApiError>(fakeLike, isApiError)).toBe(false);
        });

        it('should return false for non-HttpResponseError values, without invoking the validator', () => {
            const mockIsBody = vi.fn((): boolean => true);
            const isBody = mockIsBody as unknown as (body: unknown) => body is ApiError;

            expect(isHttpResponseError<ApiError>(new Error('regular error'), isBody)).toBe(false);
            expect(mockIsBody).toHaveBeenCalledTimes(0);
        });
    });
});
