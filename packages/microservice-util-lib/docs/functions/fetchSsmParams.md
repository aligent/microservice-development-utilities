[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / fetchSsmParams

# Function: fetchSsmParams()

Fetch SSM Parameters

## Param

the keys of the parameters to fetch

## Call Signature

> **fetchSsmParams**(`param`): `Promise`\<`undefined` \| `Parameter`\>

Defined in: [fetch-ssm-params/fetch-ssm-params.ts:14](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts#L14)

Fetch one SSM parameter

### Parameters

#### param

`string`

key of the parameter to fetch

### Returns

`Promise`\<`undefined` \| `Parameter`\>

### Param

the keys of the parameters to fetch

## Call Signature

> **fetchSsmParams**(...`params`): `Promise`\<(`undefined` \| `Parameter`)[]\>

Defined in: [fetch-ssm-params/fetch-ssm-params.ts:20](https://github.com/aligent/microservice-development-utilities/blob/e13483771966234032f5249dc36c2c31c71d7cf1/packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts#L20)

Fetch a list of SSM parameters

### Parameters

#### params

...`string`[]

list of parameter keys to fetch

### Returns

`Promise`\<(`undefined` \| `Parameter`)[]\>

### Param

the keys of the parameters to fetch
