[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SecretsManagerService

# Class: SecretsManagerService

Defined in: [secrets-manager/secrets-manager.ts:9](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L9)

Wrapper around the AWS Secrets Manager client providing structured
Powertools logging and X-Ray tracing by default.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SecretsManagerService**(`opts?`): `SecretsManagerService`

Defined in: [secrets-manager/secrets-manager.ts:20](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L20)

#### Parameters

##### opts?

###### client?

`SecretsManagerClient`

Optional pre-configured `SecretsManagerClient`. When
supplied, the wrapper does not apply X-Ray instrumentation — the caller
owns that decision.

###### logger?

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'SecretsManagerService'`.

#### Returns

`SecretsManagerService`

## Methods

<a id="getjsonsecret"></a>

### getJsonSecret()

> **getJsonSecret**\<`T`\>(`secretId`): `Promise`\<`T`\>

Defined in: [secrets-manager/secrets-manager.ts:44](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L44)

Fetch a secret and parse it as JSON.

#### Type Parameters

##### T

`T`

Expected shape of the parsed secret.

#### Parameters

##### secretId

`string`

The ARN or friendly name of the secret.

#### Returns

`Promise`\<`T`\>

The parsed secret value.

#### Throws

If the secret has no `SecretString` or the value is not valid JSON.

***

<a id="getsecret"></a>

### getSecret()

> **getSecret**(`secretId`): `Promise`\<`string`\>

Defined in: [secrets-manager/secrets-manager.ts:32](https://github.com/aligent/microservice-development-utilities/blob/30b581ee09ba114f98caadf97f423e40b9b4f410/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L32)

Fetch a secret's string value from Secrets Manager.

#### Parameters

##### secretId

`string`

The ARN or friendly name of the secret.

#### Returns

`Promise`\<`string`\>

The secret's `SecretString` value.

#### Throws

If the response does not contain a `SecretString` (e.g. the secret
stores binary data).
