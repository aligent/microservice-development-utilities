import fetchSsmParams from './fetch-ssm-params.js';
import { mockClient } from 'aws-sdk-client-mock';
import { GetParameterCommand, GetParametersCommand, SSMClient } from '@aws-sdk/client-ssm';
import 'aws-sdk-client-mock-jest';

const ssmMock = mockClient(SSMClient);

describe('fetchSsmParams', () => {
    afterEach(() => {
        ssmMock.reset();
    });

    it('should error when no params are passed', async () => {
        try {
            await fetchSsmParams();
        } catch (ex) {
            expect(ex).toBeTruthy();
        }
    });

    it('should fetch a single parameter if only one is supplied', async () => {
        try {
            await fetchSsmParams('');
            // eslint-disable-next-line no-empty
        } catch {}
        expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
        expect(ssmMock).toHaveReceivedCommandTimes(GetParametersCommand, 0);
    });

    it('should fetch a multiple parameters if more than one is supplied', async () => {
        try {
            await fetchSsmParams('', '', '');
            // eslint-disable-next-line no-empty
        } catch {}
        expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 0);
        expect(ssmMock).toHaveReceivedCommandTimes(GetParametersCommand, 1);
    });
});
