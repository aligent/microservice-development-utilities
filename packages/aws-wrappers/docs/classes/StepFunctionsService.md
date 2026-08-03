[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / StepFunctionsService

# Class: StepFunctionsService

Defined in: [sfn/sfn.ts:39](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/sfn/sfn.ts#L39)

Wrapper around the AWS Step Functions client providing structured
Powertools logging and X-Ray tracing by default.

At INFO the log lines omit payloads, secret material and PII; the verbose
levels (`POWERTOOLS_LOG_LEVEL=DEBUG` or `TRACE`) log full SDK inputs.

## Constructors

<a id="constructor"></a>

### Constructor

> **new StepFunctionsService**(`opts?`): `StepFunctionsService`

Defined in: [sfn/sfn.ts:49](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/sfn/sfn.ts#L49)

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

Defined in: [sfn/sfn.ts:82](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/sfn/sfn.ts#L82)

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

Defined in: [sfn/sfn.ts:59](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/sfn/sfn.ts#L59)

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

Defined in: [sfn/sfn.ts:72](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/sfn/sfn.ts#L72)

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

Defined in: [sfn/sfn.ts:92](https://github.com/aligent/microservice-development-utilities/blob/0505887eb00467bf78adacde3766052acbbfb10a/packages/aws-wrappers/src/sfn/sfn.ts#L92)

Stop an in-progress Step Functions execution.

#### Parameters

##### input

`StopExecutionCommandInput`

#### Returns

`Promise`\<`StopExecutionCommandOutput`\>
