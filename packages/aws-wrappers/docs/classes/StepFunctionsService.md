[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / StepFunctionsService

# Class: StepFunctionsService

Defined in: [sfn/sfn.ts:40](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/sfn/sfn.ts#L40)

Wrapper around the AWS Step Functions client providing structured
Powertools logging and X-Ray tracing by default.

Where a method's input carries payloads, secret material or PII, the INFO
log line omits them; the verbose levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or
`TRACE`) log full SDK inputs.

## Constructors

<a id="constructor"></a>

### Constructor

> **new StepFunctionsService**(`opts?`): `StepFunctionsService`

Defined in: [sfn/sfn.ts:50](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/sfn/sfn.ts#L50)

#### Parameters

##### opts?

###### client?

`SFNClient`

Optional pre-configured `SFNClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

#### Returns

`StepFunctionsService`

## Methods

<a id="describeexecution"></a>

### describeExecution()

> **describeExecution**(`input`): `Promise`\<`DescribeExecutionCommandOutput`\>

Defined in: [sfn/sfn.ts:83](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/sfn/sfn.ts#L83)

Describe an existing Step Functions execution.

#### Parameters

##### input

`DescribeExecutionCommandInput`

#### Returns

`Promise`\<`DescribeExecutionCommandOutput`\>

***

<a id="listexecutions"></a>

### listExecutions()

> **listExecutions**(`input`): `Promise`\<`ExecutionListItem`[]\>

Defined in: [sfn/sfn.ts:60](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/sfn/sfn.ts#L60)

List all executions for a state machine, auto-paginating across all
pages. Typically bounded by `statusFilter` and state-machine retention,
so the flat-array shape is safe in practice.

#### Parameters

##### input

`ListExecutionsCommandInput`

#### Returns

`Promise`\<`ExecutionListItem`[]\>

***

<a id="startexecution"></a>

### startExecution()

> **startExecution**(`input`): `Promise`\<`StartExecutionCommandOutput`\>

Defined in: [sfn/sfn.ts:73](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/sfn/sfn.ts#L73)

Start a new Step Functions execution.

#### Parameters

##### input

`StartExecutionCommandInput`

#### Returns

`Promise`\<`StartExecutionCommandOutput`\>

***

<a id="stopexecution"></a>

### stopExecution()

> **stopExecution**(`input`): `Promise`\<`StopExecutionCommandOutput`\>

Defined in: [sfn/sfn.ts:93](https://github.com/aligent/microservice-development-utilities/blob/fd6cf9d0c7112a3e2feb0c83a6bedebeddcf46ed/packages/aws-wrappers/src/sfn/sfn.ts#L93)

Stop an in-progress Step Functions execution.

#### Parameters

##### input

`StopExecutionCommandInput`

#### Returns

`Promise`\<`StopExecutionCommandOutput`\>
