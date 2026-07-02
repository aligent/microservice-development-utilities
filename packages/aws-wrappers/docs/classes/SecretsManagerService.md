[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SecretsManagerService

# Class: SecretsManagerService

Defined in: [secrets-manager/secrets-manager.ts:72](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L72)

Wrapper around the AWS Secrets Manager client providing structured
Powertools logging and X-Ray tracing by default.

Write operations (`createSecret`, `updateSecret`, `putSecretValue`,
`deleteSecret`) are exposed for convenience but should be used with care:
secret lifecycle is usually managed by IaC (CDK / Terraform). Prefer IaC
for anything that exists at deploy time; reserve runtime writes for
dynamically-issued credentials, rotation flows, or other genuinely
mutable values.

## Constructors

<a id="constructor"></a>

### Constructor

> **new SecretsManagerService**(`opts?`): `SecretsManagerService`

Defined in: [secrets-manager/secrets-manager.ts:83](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L83)

#### Parameters

##### opts?

###### client?

`SecretsManagerClient`

Optional pre-configured `SecretsManagerClient`. When
supplied, the wrapper does not apply X-Ray instrumentation — the caller
owns that decision.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

#### Returns

`SecretsManagerService`

## Methods

<a id="createsecret"></a>

### createSecret()

> **createSecret**(`input`): `Promise`\<`CreateSecretCommandOutput`\>

Defined in: [secrets-manager/secrets-manager.ts:121](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L121)

Create a new secret. At INFO level the log line includes only identity
and non-secret metadata; `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the full
input (including `SecretString` / `SecretBinary`).

Prefer IaC (CDK / Terraform) for secret lifecycle — use this for
dynamically-issued credentials only.

#### Parameters

##### input

`CreateSecretCommandInput`

#### Returns

`Promise`\<`CreateSecretCommandOutput`\>

***

<a id="deletesecret"></a>

### deleteSecret()

> **deleteSecret**(`input`): `Promise`\<`DeleteSecretCommandOutput`\>

Defined in: [secrets-manager/secrets-manager.ts:163](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L163)

Delete a secret. Pass `ForceDeleteWithoutRecovery: true` to bypass the
default 7-30 day recovery window (irreversible).

Prefer IaC (CDK / Terraform) for secret lifecycle.

#### Parameters

##### input

`DeleteSecretCommandInput`

#### Returns

`Promise`\<`DeleteSecretCommandOutput`\>

***

<a id="getjsonsecret"></a>

### getJsonSecret()

> **getJsonSecret**\<`T`\>(`secretId`): `Promise`\<`T`\>

Defined in: [secrets-manager/secrets-manager.ts:107](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L107)

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

Defined in: [secrets-manager/secrets-manager.ts:95](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L95)

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

***

<a id="putsecretvalue"></a>

### putSecretValue()

> **putSecretValue**(`input`): `Promise`\<`PutSecretValueCommandOutput`\>

Defined in: [secrets-manager/secrets-manager.ts:150](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L150)

Store a new version of a secret's value. At INFO level the log line
omits `SecretString` / `SecretBinary`; `POWERTOOLS_LOG_LEVEL=DEBUG`
unlocks the full input.

Typically used by rotation flows.

#### Parameters

##### input

`PutSecretValueCommandInput`

#### Returns

`Promise`\<`PutSecretValueCommandOutput`\>

***

<a id="updatesecret"></a>

### updateSecret()

> **updateSecret**(`input`): `Promise`\<`UpdateSecretCommandOutput`\>

Defined in: [secrets-manager/secrets-manager.ts:136](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L136)

Update an existing secret's metadata or value. At INFO level the log
line omits `SecretString` / `SecretBinary`; `POWERTOOLS_LOG_LEVEL=DEBUG`
unlocks the full input.

Prefer IaC (CDK / Terraform) for secret lifecycle — use this for
runtime metadata updates only.

#### Parameters

##### input

`UpdateSecretCommandInput`

#### Returns

`Promise`\<`UpdateSecretCommandOutput`\>
