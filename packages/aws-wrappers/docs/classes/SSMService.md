[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SSMService

# Class: SSMService

Defined in: [ssm/ssm.ts:17](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/ssm/ssm.ts#L17)

Wrapper around the AWS SSM Parameter Store client providing structured
Powertools logging and X-Ray tracing by default. All operations enable
`WithDecryption` — callers needing plaintext should use `SSMClient`
directly.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SSMService**(`opts?`): `SSMService`

Defined in: [ssm/ssm.ts:27](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/ssm/ssm.ts#L27)

#### Parameters

##### opts?

###### client?

`SSMClient`

Optional pre-configured `SSMClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'SSMService'`.

#### Returns

`SSMService`

## Methods

<a id="getparameter"></a>

### getParameter()

> **getParameter**(`name`): `Promise`\<`string` \| `undefined`\>

Defined in: [ssm/ssm.ts:38](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/ssm/ssm.ts#L38)

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

> **getParameters**(`names`): `Promise`\<`Record`\<`string`, `string` \| `undefined`\>\>

Defined in: [ssm/ssm.ts:57](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/ssm/ssm.ts#L57)

Fetch multiple SSM parameters in a single request. The returned record
is keyed by parameter name so callers can destructure:
`const { foo, bar } = await ssm.getParameters(['foo', 'bar']);`.

#### Parameters

##### names

`string`[]

The parameter names (or ARNs) to fetch.

#### Returns

`Promise`\<`Record`\<`string`, `string` \| `undefined`\>\>

A record mapping each requested name to its value, or
`undefined` when the parameter is missing or has no value.

***

<a id="getparametersbypath"></a>

### getParametersByPath()

> **getParametersByPath**(`path`, `opts?`): `Promise`\<`Parameter`[]\>

Defined in: [ssm/ssm.ts:80](https://github.com/aligent/microservice-development-utilities/blob/095270c3292da70d58f540c405577edc0c2ab315/packages/aws-wrappers/src/ssm/ssm.ts#L80)

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
