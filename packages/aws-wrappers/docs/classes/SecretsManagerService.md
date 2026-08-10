[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SecretsManagerService

# Class: SecretsManagerService

Defined in: [secrets-manager/secrets-manager.ts:75](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L75)

Wrapper around the AWS Secrets Manager client providing structured
Powertools logging and X-Ray tracing by default.

Where a method's input carries payloads, secret material or PII, the INFO
log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
`TRACE`) log full SDK inputs.

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

Defined in: [secrets-manager/secrets-manager.ts:86](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L86)

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

Defined in: [secrets-manager/secrets-manager.ts:123](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L123)

Create a new secret. At INFO level the log line includes only identity
and non-secret metadata.

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

Defined in: [secrets-manager/secrets-manager.ts:163](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L163)

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

Defined in: [secrets-manager/secrets-manager.ts:110](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L110)

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

Defined in: [secrets-manager/secrets-manager.ts:98](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L98)

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

Defined in: [secrets-manager/secrets-manager.ts:150](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L150)

Store a new version of a secret's value. At INFO level the log line
omits `SecretString` / `SecretBinary`.

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

Defined in: [secrets-manager/secrets-manager.ts:137](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/secrets-manager/secrets-manager.ts#L137)

Update an existing secret's metadata or value. At INFO level the log
line omits `SecretString` / `SecretBinary`.

Prefer IaC (CDK / Terraform) for secret lifecycle — use this for
runtime metadata updates only.

#### Parameters

##### input

`UpdateSecretCommandInput`

#### Returns

`Promise`\<`UpdateSecretCommandOutput`\>
