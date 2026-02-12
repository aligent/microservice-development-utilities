import createClient from 'openapi-fetch';
import {
    ApiKey,
    apiKeyAuthMiddleware,
    Basic,
    basicAuthMiddleware,
    OAuth10a,
    oAuth10aAuthMiddleware,
    OAuth20,
    oAuth20AuthMiddleware,
} from './authentications';
import * as oauth10aAuth from './oauth10a/oauth10a';

interface paths {
    '/path': { get: object };
}

describe('authentications middlewares', () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
        mockFetch.mockResolvedValue(
            new Response(JSON.stringify({ message: 'success' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('apiKeyAuthMiddleware should set the API key in the correct header', async () => {
        const config: ApiKey = {
            header: 'x-api-key',
            value: () => new Promise(resolve => resolve('mock-api-key')),
        };

        const client = createClient<paths>({
            baseUrl: 'https://base.url/api',
            fetch: mockFetch as typeof fetch,
        });
        client.use(apiKeyAuthMiddleware(config));

        await client.GET('/path');
        expect(mockFetch).toHaveBeenCalledOnce();

        const request = mockFetch.mock.calls?.[0]?.[0] as Request;
        expect(request.headers.get('x-api-key')).toBe('mock-api-key');
    });

    it('basicAuthMiddleware should set the Authorization header with the correct Basic auth', async () => {
        const config: Basic = {
            credentials: vi.fn().mockResolvedValue({ username: 'user', password: 'pass' }),
        };

        const client = createClient<paths>({
            baseUrl: 'https://base.url/api',
            fetch: mockFetch as typeof fetch,
        });
        client.use(basicAuthMiddleware(config));

        await client.GET('/path');
        expect(mockFetch).toHaveBeenCalledOnce();

        const request = mockFetch.mock.calls?.[0]?.[0] as Request;
        expect(request.headers.get('Authorization')).toBe(
            'Basic ' + Buffer.from('user:pass').toString('base64')
        );
    });

    it('oAuth10aAuthMiddleware should set the Authorization header with the correct OAuth 1.0a params', async () => {
        vi.spyOn(oauth10aAuth, 'generateOauthParams').mockResolvedValue('mock-oauth-params');

        const config: OAuth10a = {
            algorithm: 'HMAC-SHA256',
            credentials: vi.fn().mockResolvedValue({
                consumerKey: 'k',
                consumerSecret: 's',
                token: 't',
                tokenSecret: 'ts',
            }),
        };

        const client = createClient<paths>({
            baseUrl: 'https://base.url/api',
            fetch: mockFetch as typeof fetch,
        });
        client.use(oAuth10aAuthMiddleware(config));

        await client.GET('/path');
        expect(mockFetch).toHaveBeenCalledOnce();

        const request = mockFetch.mock.calls?.[0]?.[0] as Request;
        expect(request.headers.get('Authorization')).toBe(`OAuth mock-oauth-params`);
    });

    it('oAuth20AuthMiddleware should set the Authorization header with the correct OAuth 2.0 token', async () => {
        const config: OAuth20 = {
            token: vi.fn().mockResolvedValue('mock-access-token'),
            tokenType: 'Mock',
        };

        const client = createClient<paths>({
            baseUrl: 'https://base.url/api',
            fetch: mockFetch as typeof fetch,
        });
        client.use(oAuth20AuthMiddleware(config));

        await client.GET('/path');
        expect(mockFetch).toHaveBeenCalledOnce();

        const request = mockFetch.mock.calls?.[0]?.[0] as Request;
        expect(request.headers.get('Authorization')).toBe('Mock mock-access-token');
    });

    it('oAuth20AuthMiddleware should default to Bearer token type if not specified', async () => {
        const config: OAuth20 = {
            token: vi.fn().mockResolvedValue('mock-access-token'),
        };

        const client = createClient<paths>({
            baseUrl: 'https://base.url/api',
            fetch: mockFetch as typeof fetch,
        });
        client.use(oAuth20AuthMiddleware(config));

        await client.GET('/path');
        expect(mockFetch).toHaveBeenCalledOnce();

        const request = mockFetch.mock.calls?.[0]?.[0] as Request;
        expect(request.headers.get('Authorization')).toBe('Bearer mock-access-token');
    });
});
