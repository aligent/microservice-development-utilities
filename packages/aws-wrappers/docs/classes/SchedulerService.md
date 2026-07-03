[**@aligent/aws-wrappers**](../modules.md)

***

[@aligent/aws-wrappers](../modules.md) / SchedulerService

# Class: SchedulerService

Defined in: scheduler/scheduler.ts:75

Wrapper around the AWS EventBridge Scheduler client providing structured
Powertools logging and X-Ray tracing by default.

Covers CRUD on schedules and their groups. Named `SchedulerService` (not
`EventBridgeSchedulerService`) so it doesn't collide with a future wrapper
over the separate EventBridge bus/rules API (`@aws-sdk/client-eventbridge`).

`FlexibleTimeWindow` is required by `CreateSchedule` and is passed through
untouched — the wrapper bakes in no default, so the caller must state their
intent (`{ Mode: 'OFF' }` for a fixed-time schedule).

## Constructors

<a id="constructor"></a>

### Constructor

> **new SchedulerService**(`opts?`): `SchedulerService`

Defined in: scheduler/scheduler.ts:85

#### Parameters

##### opts?

###### client?

`SchedulerClient`

Optional pre-configured `SchedulerClient`. When
supplied, the wrapper does not apply X-Ray instrumentation.

###### logger?

`LoggerInterface`

Optional Powertools logger. Defaults to `new Logger()`,
which picks up `POWERTOOLS_SERVICE_NAME` from the environment.

#### Returns

`SchedulerService`

## Methods

<a id="createschedule"></a>

### createSchedule()

> **createSchedule**(`input`): `Promise`\<`CreateScheduleCommandOutput`\>

Defined in: scheduler/scheduler.ts:95

Create a new schedule. At INFO the log line omits `Target.Input` (the
target payload, a PII carrier); `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the
full input.

#### Parameters

##### input

`CreateScheduleCommandInput`

#### Returns

`Promise`\<`CreateScheduleCommandOutput`\>

***

<a id="createschedulegroup"></a>

### createScheduleGroup()

> **createScheduleGroup**(`input`): `Promise`\<`CreateScheduleGroupCommandOutput`\>

Defined in: scheduler/scheduler.ts:154

Create a new schedule group. Groups are containers for schedules and are
typically IaC-managed; use this for dynamically-provisioned groups only.

#### Parameters

##### input

`CreateScheduleGroupCommandInput`

#### Returns

`Promise`\<`CreateScheduleGroupCommandOutput`\>

***

<a id="deleteschedule"></a>

### deleteSchedule()

> **deleteSchedule**(`input`): `Promise`\<`DeleteScheduleCommandOutput`\>

Defined in: scheduler/scheduler.ts:130

Delete a schedule.

#### Parameters

##### input

`DeleteScheduleCommandInput`

#### Returns

`Promise`\<`DeleteScheduleCommandOutput`\>

***

<a id="deleteschedulegroup"></a>

### deleteScheduleGroup()

> **deleteScheduleGroup**(`input`): `Promise`\<`DeleteScheduleGroupCommandOutput`\>

Defined in: scheduler/scheduler.ts:176

Delete a schedule group. Deleting a group also deletes every schedule it
contains, asynchronously — the API has no `UpdateScheduleGroup`, so this
is the only mutating group operation besides create.

#### Parameters

##### input

`DeleteScheduleGroupCommandInput`

#### Returns

`Promise`\<`DeleteScheduleGroupCommandOutput`\>

***

<a id="getschedule"></a>

### getSchedule()

> **getSchedule**(`input`): `Promise`\<`GetScheduleCommandOutput`\>

Defined in: scheduler/scheduler.ts:103

Fetch a schedule's full configuration.

#### Parameters

##### input

`GetScheduleCommandInput`

#### Returns

`Promise`\<`GetScheduleCommandOutput`\>

***

<a id="getschedulegroup"></a>

### getScheduleGroup()

> **getScheduleGroup**(`input`): `Promise`\<`GetScheduleGroupCommandOutput`\>

Defined in: scheduler/scheduler.ts:164

Fetch a schedule group's configuration.

#### Parameters

##### input

`GetScheduleGroupCommandInput`

#### Returns

`Promise`\<`GetScheduleGroupCommandOutput`\>

***

<a id="listschedulegroups"></a>

### listScheduleGroups()

> **listScheduleGroups**(`input?`): `Promise`\<`ScheduleGroupSummary`[]\>

Defined in: scheduler/scheduler.ts:187

List schedule groups, auto-paginating across all pages. Bounded in
practice by the account's group count and the `NamePrefix` filter.

#### Parameters

##### input?

`ListScheduleGroupsCommandInput`

#### Returns

`Promise`\<`ScheduleGroupSummary`[]\>

***

<a id="listschedules"></a>

### listSchedules()

> **listSchedules**(`input?`): `Promise`\<`ScheduleSummary`[]\>

Defined in: scheduler/scheduler.ts:140

List schedules, auto-paginating across all pages. Bounded in practice by
the account's schedule count and the `GroupName` / `NamePrefix` / `State`
filters, so the flat-array shape is safe.

#### Parameters

##### input?

`ListSchedulesCommandInput`

#### Returns

`Promise`\<`ScheduleSummary`[]\>

***

<a id="updateschedule"></a>

### updateSchedule()

> **updateSchedule**(`input`): `Promise`\<`UpdateScheduleCommandOutput`\>

Defined in: scheduler/scheduler.ts:122

Update an existing schedule.

**`UpdateSchedule` has PUT (full-replacement) semantics.** Any field you
omit is reset to its default — this is not a partial patch. To change one
attribute, `getSchedule` first and resend the complete configuration with
that attribute modified, or you will silently erase `ScheduleExpression`,
`Target`, `Description`, `StartDate`, etc. The wrapper does not merge on
your behalf: deep-merging a `Target` (with its mutually-exclusive
target-type params) has no single correct semantics.

At INFO the log line omits `Target.Input`; `POWERTOOLS_LOG_LEVEL=DEBUG`
unlocks the full input.

#### Parameters

##### input

`UpdateScheduleCommandInput`

#### Returns

`Promise`\<`UpdateScheduleCommandOutput`\>
