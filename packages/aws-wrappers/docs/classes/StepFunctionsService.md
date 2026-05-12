[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / StepFunctionsService

# Class: StepFunctionsService

Defined in: [sfn/sfn.ts:23](https://github.com/aligent/microservice-development-utilities/blob/79028d636d9b991b57e28c161ef604e6d0b09ac9/packages/aws-wrappers/src/sfn/sfn.ts#L23)

Wrapper around the AWS Step Functions client providing structured
Powertools logging and X-Ray tracing by default.

## Constructors

<a id="constructor"></a>

### Constructor

> **new StepFunctionsService**(`opts?`): `StepFunctionsService`

Defined in: [sfn/sfn.ts:33](https://github.com/aligent/microservice-development-utilities/blob/79028d636d9b991b57e28c161ef604e6d0b09ac9/packages/aws-wrappers/src/sfn/sfn.ts#L33)

#### Parameters

##### opts?

###### client?

`SFNClient`

Optional pre-configured `SFNClient`. When supplied,
the wrapper does not apply X-Ray instrumentation.

###### logger?

`Logger`

Optional Powertools logger. Defaults to a logger with
`serviceName: 'StepFunctionsService'`.

#### Returns

`StepFunctionsService`

## Methods

<a id="describeexecution"></a>

### describeExecution()

> **describeExecution**(`input`): `Promise`\<`DescribeExecutionCommandOutput`\>

Defined in: [sfn/sfn.ts:64](https://github.com/aligent/microservice-development-utilities/blob/79028d636d9b991b57e28c161ef604e6d0b09ac9/packages/aws-wrappers/src/sfn/sfn.ts#L64)

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

Defined in: [sfn/sfn.ts:43](https://github.com/aligent/microservice-development-utilities/blob/79028d636d9b991b57e28c161ef604e6d0b09ac9/packages/aws-wrappers/src/sfn/sfn.ts#L43)

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

Defined in: [sfn/sfn.ts:56](https://github.com/aligent/microservice-development-utilities/blob/79028d636d9b991b57e28c161ef604e6d0b09ac9/packages/aws-wrappers/src/sfn/sfn.ts#L56)

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

Defined in: [sfn/sfn.ts:74](https://github.com/aligent/microservice-development-utilities/blob/79028d636d9b991b57e28c161ef604e6d0b09ac9/packages/aws-wrappers/src/sfn/sfn.ts#L74)

Stop an in-progress Step Functions execution.

#### Parameters

##### input

`StopExecutionCommandInput`

#### Returns

`Promise`\<`StopExecutionCommandOutput`\>
