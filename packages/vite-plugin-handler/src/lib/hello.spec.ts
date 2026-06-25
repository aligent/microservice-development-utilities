import { describe, expect, it } from 'vitest';
import { hello } from './index';

describe('vite-plugin-handler', () => {
    describe('hello', () => {
        it('should return a greeting message', () => {
            expect(hello()).toBe('Hello from @aligent/vite-plugin-handler!');
        });
    });
});
