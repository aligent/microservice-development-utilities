import crypto from 'crypto';
import { MiddlewareCallbackParams } from 'openapi-fetch';
import { vi } from 'vitest';
import { OAuth10a } from '../authentications';
import { generateOauthParams } from './oauth10a';

describe('generateOauthParams', () => {
    const baseRequest: MiddlewareCallbackParams['request'] = {
        method: 'get',
        url: 'path/with/string',
        cache: 'default',
        credentials: 'same-origin',
        headers: new Headers(),
        integrity: '',
        keepalive: false,
        mode: 'cors',
        redirect: 'follow',
        referrer: '',
        referrerPolicy: '',
        signal: new AbortController().signal,
        body: null,
        bodyUsed: false,
        destination: 'document',
        duplex: 'half',
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob(Array(new ArrayBuffer(0)))),
        formData: () => Promise.resolve(new FormData()),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        clone: () => ({ ...baseRequest }),
    };

    const baseOptions: MiddlewareCallbackParams['options'] = {
        baseUrl: 'https://base.url',
        bodySerializer: () => '',
        fetch: () => Promise.resolve(new Response()),
        pathSerializer: () => '',
        querySerializer: () => '',
        parseAs: 'json',
    };

    const credentialsWithToken = {
        consumerKey: 'k',
        consumerSecret: 's',
        token: 't',
        tokenSecret: 'ts',
    };

    const credentialsWithoutToken = { consumerKey: 'k', consumerSecret: 's', tokenSecret: 'ts' };

    beforeEach(() => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('123-456-789-0ab-cde');
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-04-30T12:00:00Z'));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('generate correct HMAC-SHA256 signature to simple GET with token', async () => {
        const request: MiddlewareCallbackParams['request'] = { ...baseRequest };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA256',
            credentials: () => new Promise(res => res(credentialsWithToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA256"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_token="t"',
            'oauth_signature="yQba6Ltki9xOf8eFpVdx%2B5LB9AvnqDpaL9BiuyWZU%2B4%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA1 signature to simple GET without token', async () => {
        const request: MiddlewareCallbackParams['request'] = { ...baseRequest };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA1',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA1"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_signature="DSSCOJJyeTcFwYy%2BudlBUWUqL2g%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA256 signature to simple POST request with token and JSON body', async () => {
        const request: MiddlewareCallbackParams['request'] = {
            ...baseRequest,
            method: 'post',
            text: () => Promise.resolve('{"a":1,"b":2}'),
            clone: () => ({ ...request }),
        };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA256',
            credentials: () => new Promise(res => res(credentialsWithToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA256"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_token="t"',
            'oauth_body_hash="QyWM%2F3g%2F5wNtikMDP4MK38YOwDc4JHNUisdCuIgpJ3c%3D"',
            'oauth_signature="t9oLqpxzDG4p90CWZ18BW%2FZgUz0NpB1dNfQY7EcgLBg%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA1 signature to simple POST request without token and using URLSearchParams in body', async () => {
        const request: MiddlewareCallbackParams['request'] = {
            ...baseRequest,
            method: 'post',
            headers: new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
            text: () => Promise.resolve('a=1&b=2'),
            clone: () => ({ ...request }),
        };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA1',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA1"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_signature="VRnvkkfIdfGLOUm6hIrySl7wpNg%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA1 signature to simple POST request with query parameters', async () => {
        const request: MiddlewareCallbackParams['request'] = {
            ...baseRequest,
            method: 'post',
            clone: () => ({ ...request }),
        };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {
            query: { a: '1', b: '2' },
        };
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA1',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA1"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_signature="VRnvkkfIdfGLOUm6hIrySl7wpNg%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA1 signature to simple GET request with callback URL', async () => {
        const request: MiddlewareCallbackParams['request'] = { ...baseRequest };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA1',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
            callback: 'https://cb.url',
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA1"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_callback="https%3A%2F%2Fcb.url"',
            'oauth_signature="a4USzaCxhroz8IAjRK5CGBZdHUE%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA256 signature to simple GET request with verifier', async () => {
        const request: MiddlewareCallbackParams['request'] = { ...baseRequest };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA256',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
            verifier: 'v',
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA256"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_verifier="v"',
            'oauth_signature="wk%2BGRYrH0UdYk6PbRbpvPH5YEaLwekLeOVYw2a96pCo%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA1 signature to simple POST request with callback URL, verifier, & realm', async () => {
        const request: MiddlewareCallbackParams['request'] = {
            ...baseRequest,
            method: 'post',
            clone: () => ({ ...request }),
        };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {};
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA1',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
            callback: 'https://cb.url',
            verifier: 'v',
            realm: 'r',
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA1"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_callback="https%3A%2F%2Fcb.url"',
            'oauth_verifier="v"',
            'oauth_signature="4wqu8nKP2uNccOt9MIk6MrXE8LU%3D"',
            'realm="r"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA1 signature to simple GET request with path parameters', async () => {
        const request: MiddlewareCallbackParams['request'] = {
            ...baseRequest,
            url: 'path/with/{param1}/and/{param2}',
            clone: () => ({ ...request }),
        };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = { path: { param1: '1', param2: '2' } };
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA1',
            credentials: () => new Promise(res => res(credentialsWithoutToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA1"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_signature="A2IMN9WHQTBGQs22%2FUCsALFIzbc%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });

    it('generate correct HMAC-SHA256 signature to simple GET request with query parameters that contains space character', async () => {
        const request: MiddlewareCallbackParams['request'] = { ...baseRequest };
        const options: MiddlewareCallbackParams['options'] = { ...baseOptions };
        const params: MiddlewareCallbackParams['params'] = {
            query: { time: '2023-04-04 00:00:00' },
        };
        const config: OAuth10a = {
            algorithm: 'HMAC-SHA256',
            credentials: () => new Promise(res => res(credentialsWithToken)),
        };

        const expected = [
            'oauth_consumer_key="k"',
            'oauth_nonce="123-456-789-0ab-cde"',
            'oauth_signature_method="HMAC-SHA256"',
            'oauth_timestamp="1746014400"',
            'oauth_version="1.0"',
            'oauth_token="t"',
            'oauth_signature="%2Bw6sg1TnjlPnW3viyEo%2BkTe3EbuCXQmB1uz7kXcsI7c%3D"',
        ].join(',');

        const result = await generateOauthParams(request, options, params, config);
        expect(result).toEqual(expected);
    });
});
