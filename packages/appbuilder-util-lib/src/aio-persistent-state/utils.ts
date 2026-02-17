import AioLogger from '@adobe/aio-lib-core-logging';
import base64url from 'base64url';

import { MAX_KEY_SIZE } from './constants';

/** Default logger instance for the aio-persistent-state module. */
export const defaultLogger = AioLogger('aio-persistent-state', {
    level: 'info',
});

/**
 * Encodes a key using base64url so it is safe for use in Adobe I/O State,
 * which requires keys to match the pattern `/^[a-zA-Z0-9-_.]{1,1024}$/`.
 *
 * @param key - The original key string.
 * @returns The base64url-encoded key.
 * @throws {Error} If the encoded key exceeds 1024 characters ({@link MAX_KEY_SIZE}).
 */
export function encodeKey(key: string): string {
    const encodedKey = base64url.encode(key);
    if (encodedKey.length > MAX_KEY_SIZE) {
        throw new Error(`Encoded key exceeds maximum size of ${MAX_KEY_SIZE} characters`);
    }
    return encodedKey;
}
