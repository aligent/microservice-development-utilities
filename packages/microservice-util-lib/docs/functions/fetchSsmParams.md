[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / fetchSsmParams

# Function: fetchSsmParams()

Fetch SSM Parameters

## Param

the keys of the parameters to fetch

## fetchSsmParams(param)

> **fetchSsmParams**(`param`): `Promise`\<`Parameter` \| `undefined`\>

Fetch one SSM parameter

### Parameters

• **param**: `string`

key of the parameter to fetch

### Returns

`Promise`\<`Parameter` \| `undefined`\>

### Param

the keys of the parameters to fetch

### Defined in

[fetch-ssm-params/fetch-ssm-params.ts:14](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts#L14)

## fetchSsmParams(params)

> **fetchSsmParams**(...`params`): `Promise`\<(`Parameter` \| `undefined`)[]\>

Fetch a list of SSM parameters

### Parameters

• ...**params**: `string`[]

list of parameter keys to fetch

### Returns

`Promise`\<(`Parameter` \| `undefined`)[]\>

### Param

the keys of the parameters to fetch

### Defined in

[fetch-ssm-params/fetch-ssm-params.ts:21](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts#L21)
