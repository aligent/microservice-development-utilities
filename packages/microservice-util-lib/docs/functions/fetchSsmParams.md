[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / fetchSsmParams

# ~~Function: fetchSsmParams()~~

Fetch SSM Parameters

## Deprecated

Superseded by `SSMService` in `@aligent/aws-wrappers`, which adds
Powertools logging and X-Ray tracing, and returns values keyed by caller-chosen
aliases rather than positionally.

```ts
// Before
const [username, password] = await fetchSsmParams('/app/username', '/app/password');

// After
const ssm = new SSMService();
const { username, password } = await ssm.getParameters({
    username: '/app/username',
    password: '/app/password',
});
```

## Param

**params**

the keys of the parameters to fetch

## Call Signature

> **fetchSsmParams**(`param`): `Promise`\<`Parameter` \| `undefined`\>

Defined in: [packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts:15](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts#L15)

Fetch one SSM parameter

### Parameters

#### param

`string`

key of the parameter to fetch

### Returns

`Promise`\<`Parameter` \| `undefined`\>

### Deprecated

Use `SSMService#getParameter` from `@aligent/aws-wrappers` instead.

## Call Signature

> **fetchSsmParams**(...`params`): `Promise`\<(`Parameter` \| `undefined`)[]\>

Defined in: [packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts:22](https://github.com/aligent/microservice-development-utilities/blob/3299b477c44ea5ded7c52690ed62a5aa48c95908/packages/microservice-util-lib/src/fetch-ssm-params/fetch-ssm-params.ts#L22)

Fetch a list of SSM parameters

### Parameters

#### params

...`string`[]

list of parameter keys to fetch

### Returns

`Promise`\<(`Parameter` \| `undefined`)[]\>

### Deprecated

Use `SSMService#getParameters` from `@aligent/aws-wrappers` instead.
