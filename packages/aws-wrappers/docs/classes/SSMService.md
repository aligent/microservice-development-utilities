[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SSMService

# Class: SSMService

Defined in: [ssm/ssm.ts:47](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L47)

Wrapper around the AWS SSM Parameter Store client providing structured
Powertools logging and X-Ray tracing by default. All read operations enable
`WithDecryption` — callers needing plaintext should use `SSMClient`
directly.

Write operations (`putParameter`, `deleteParameter`) are exposed for
convenience but should be used with care: parameter lifecycle is usually
managed by IaC (CDK / Terraform). Prefer IaC for anything that exists at
deploy time; reserve runtime writes for values that genuinely need to
mutate within the application.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SSMService**(`opts?`): `SSMService`

Defined in: [ssm/ssm.ts:57](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L57)

#### Parameters

##### opts?

###### client?

`SSMClient`

Optional pre-configured `SSMClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

#### Returns

`SSMService`

## Methods

<a id="deleteparameter"></a>

### deleteParameter()

> **deleteParameter**(`name`): `Promise`\<`void`\>

Defined in: [ssm/ssm.ts:136](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L136)

Delete an SSM parameter by name.

Prefer IaC (CDK / Terraform) for parameter lifecycle — use this for
runtime cleanup only.

#### Parameters

##### name

`string`

#### Returns

`Promise`\<`void`\>

***

<a id="getparameter"></a>

### getParameter()

> **getParameter**(`name`): `Promise`\<`string` \| `undefined`\>

Defined in: [ssm/ssm.ts:68](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L68)

Fetch a single SSM parameter's value.

#### Parameters

##### name

`string`

The parameter name (or ARN).

#### Returns

`Promise`\<`string` \| `undefined`\>

The parameter value, or `undefined` if the parameter has no
value set.

***

<a id="getparameters"></a>

### getParameters()

> **getParameters**\<`K`\>(`aliases`): `Promise`\<`Record`\<`K`, `string` \| `undefined`\>\>

Defined in: [ssm/ssm.ts:95](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L95)

Fetch multiple SSM parameters in a single request. Callers supply an
alias-to-path record, and the returned record is keyed by the same
aliases — so the SSM path is only mentioned at the call site and the
destructured names are whatever the caller wants to use locally:

```ts
const { username, password } = await ssm.getParameters({
    username: '/myapp/db/username',
    password: '/myapp/db/password',
});
```

#### Type Parameters

##### K

`K` *extends* `string`

#### Parameters

##### aliases

`Record`\<`K`, `string`\>

Record mapping each desired local alias to its SSM
parameter name (or ARN).

#### Returns

`Promise`\<`Record`\<`K`, `string` \| `undefined`\>\>

A record keyed by the same aliases, mapping each to the
parameter's value, or `undefined` when the parameter is missing or has
no value.

***

<a id="getparametersbypath"></a>

### getParametersByPath()

> **getParametersByPath**(`path`, `opts?`): `Promise`\<`Parameter`[]\>

Defined in: [ssm/ssm.ts:152](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L152)

Fetch all parameters under an SSM hierarchy path, auto-paginating across
all pages. `Recursive` defaults to `true` (overriding the AWS SDK
default of `false`) to match the typical "load all config under
`/myapp/`" use case.

#### Parameters

##### path

`string`

The parameter path prefix (e.g. `/myapp/`).

##### opts?

###### recursive?

`boolean`

Whether to recurse into nested paths. Defaults
to `true`.

#### Returns

`Promise`\<`Parameter`[]\>

The full `Parameter` objects (including `Version`,
`LastModifiedDate`, etc.).

***

<a id="putparameter"></a>

### putParameter()

> **putParameter**(`input`): `Promise`\<`PutParameterCommandOutput`\>

Defined in: [ssm/ssm.ts:123](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/ssm/ssm.ts#L123)

Create or update an SSM parameter. The log line omits `Value` to avoid
leaking secret material.

Prefer IaC (CDK / Terraform) for parameter lifecycle — use this for
runtime values only.

#### Parameters

##### input

`PutParameterCommandInput`

#### Returns

`Promise`\<`PutParameterCommandOutput`\>
