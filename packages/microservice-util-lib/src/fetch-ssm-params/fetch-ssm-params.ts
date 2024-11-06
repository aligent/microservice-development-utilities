import {
    GetParameterCommand,
    GetParametersCommand,
    Parameter,
    SSMClient,
} from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});

/**
 * Fetch one SSM parameter
 * @param param key of the parameter to fetch
 */
async function fetchSsmParams(param: string): Promise<Parameter | undefined>;

/**
 * Fetch a list of SSM parameters
 * @param params list of parameter keys to fetch
 */
async function fetchSsmParams(...params: string[]): Promise<(Parameter | undefined)[]>;

/**
 * Fetch SSM Parameters
 * @param params the keys of the parameters to fetch
 */
async function fetchSsmParams(...params: string[]) {
    if (params.length === 0) {
        throw new Error('No SSM Params supplied');
    }

    if (params.length === 1) {
        const result = await ssm.send(
            new GetParameterCommand({
                Name: params[0],
                WithDecryption: true,
            })
        );

        return result.Parameter;
    }

    const result = await ssm.send(
        new GetParametersCommand({
            Names: params,
            WithDecryption: true,
        })
    );

    return params.map(paramName => {
        return result.Parameters?.find(param => param.Name === paramName);
    });
}

export default fetchSsmParams;
