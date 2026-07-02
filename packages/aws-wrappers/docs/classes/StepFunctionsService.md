[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / StepFunctionsService

# Class: StepFunctionsService

Defined in: [sfn/sfn.ts:36](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sfn/sfn.ts#L36)

Wrapper around the AWS Step Functions client providing structured
Powertools logging and X-Ray tracing by default.

## Constructors

<a id="constructor"></a>

### Constructor

> **new StepFunctionsService**(`opts?`): `StepFunctionsService`

Defined in: [sfn/sfn.ts:46](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sfn/sfn.ts#L46)

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

Defined in: [sfn/sfn.ts:79](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sfn/sfn.ts#L79)

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

Defined in: [sfn/sfn.ts:56](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sfn/sfn.ts#L56)

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

Defined in: [sfn/sfn.ts:69](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sfn/sfn.ts#L69)

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

Defined in: [sfn/sfn.ts:89](https://github.com/aligent/microservice-development-utilities/blob/1c8403742cbf82a4bd82725126d0860e0996e39d/packages/aws-wrappers/src/sfn/sfn.ts#L89)

Stop an in-progress Step Functions execution.

#### Parameters

##### input

`StopExecutionCommandInput`

#### Returns

`Promise`\<`StopExecutionCommandOutput`\>
