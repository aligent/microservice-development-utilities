import { Logger } from '@aws-lambda-powertools/logger';
import type { LoggerInterface } from '@aws-lambda-powertools/logger/types';
import {
    CreateScheduleCommand,
    CreateScheduleCommandInput,
    CreateScheduleCommandOutput,
    CreateScheduleGroupCommand,
    CreateScheduleGroupCommandInput,
    CreateScheduleGroupCommandOutput,
    DeleteScheduleCommand,
    DeleteScheduleCommandInput,
    DeleteScheduleCommandOutput,
    DeleteScheduleGroupCommand,
    DeleteScheduleGroupCommandInput,
    DeleteScheduleGroupCommandOutput,
    GetScheduleCommand,
    GetScheduleCommandInput,
    GetScheduleCommandOutput,
    GetScheduleGroupCommand,
    GetScheduleGroupCommandInput,
    GetScheduleGroupCommandOutput,
    ListScheduleGroupsCommandInput,
    ListSchedulesCommandInput,
    paginateListScheduleGroups,
    paginateListSchedules,
    ScheduleGroupSummary,
    SchedulerClient,
    ScheduleSummary,
    Target,
    UpdateScheduleCommand,
    UpdateScheduleCommandInput,
    UpdateScheduleCommandOutput,
} from '@aws-sdk/client-scheduler';
import xray from 'aws-xray-sdk-core';

/**
 * `CreateSchedule` / `UpdateSchedule` inputs carry the payload handed to the
 * target at `Target.Input` — arbitrary text or JSON that routinely contains
 * PII (customer IDs, order contents, etc.), the same risk profile as SFN's
 * execution `input`.
 *
 * This can't go through the package's usual `filterFieldsForLogLevel` helper:
 * that helper picks **top-level** keys only, and the sensitive field is nested
 * one level down inside `Target`. Allowlisting `Target` would leak `Input`;
 * omitting `Target` would lose operationally-useful fields (`Arn`, `RoleArn`,
 * `RetryPolicy`, `DeadLetterConfig`, the target-type params). So this is a
 * bespoke case: keep every top-level field and shallow-strip only
 * `Target.Input`.
 *
 * At `DEBUG` the input is returned unchanged — operators who set
 * `POWERTOOLS_LOG_LEVEL=DEBUG` have opted into seeing payloads and PII.
 */
function redactTargetInput<T extends { Target?: Target | undefined }>(
    logger: LoggerInterface,
    input: T
): T {
    if (logger.getLevelName() === 'DEBUG') return input;
    if (input.Target?.Input === undefined) return input;
    const { Input: _input, ...safeTarget } = input.Target;
    return { ...input, Target: safeTarget as Target };
}

/**
 * Wrapper around the AWS EventBridge Scheduler client providing structured
 * Powertools logging and X-Ray tracing by default.
 *
 * Covers CRUD on schedules and their groups. Named `SchedulerService` (not
 * `EventBridgeSchedulerService`) so it doesn't collide with a future wrapper
 * over the separate EventBridge bus/rules API (`@aws-sdk/client-eventbridge`).
 *
 * `FlexibleTimeWindow` is required by `CreateSchedule` and is passed through
 * untouched — the wrapper bakes in no default, so the caller must state their
 * intent (`{ Mode: 'OFF' }` for a fixed-time schedule).
 */
export class SchedulerService {
    private readonly client: SchedulerClient;
    private readonly logger: LoggerInterface;

    /**
     * @param opts.logger - Optional Powertools logger. Defaults to `new Logger()`,
     * which picks up `POWERTOOLS_SERVICE_NAME` from the environment.
     * @param opts.client - Optional pre-configured `SchedulerClient`. When
     * supplied, the wrapper does not apply X-Ray instrumentation.
     */
    constructor(opts?: { logger?: LoggerInterface; client?: SchedulerClient }) {
        this.client = opts?.client ?? xray.captureAWSv3Client(new SchedulerClient());
        this.logger = opts?.logger ?? new Logger();
    }

    /**
     * Create a new schedule. At INFO the log line omits `Target.Input` (the
     * target payload, a PII carrier); `POWERTOOLS_LOG_LEVEL=DEBUG` unlocks the
     * full input.
     */
    async createSchedule(input: CreateScheduleCommandInput): Promise<CreateScheduleCommandOutput> {
        this.logger.info('Creating schedule', { input: redactTargetInput(this.logger, input) });
        return this.client.send(new CreateScheduleCommand(input));
    }

    /**
     * Fetch a schedule's full configuration.
     */
    async getSchedule(input: GetScheduleCommandInput): Promise<GetScheduleCommandOutput> {
        this.logger.info('Getting schedule', { input });
        return this.client.send(new GetScheduleCommand(input));
    }

    /**
     * Update an existing schedule.
     *
     * **`UpdateSchedule` has PUT (full-replacement) semantics.** Any field you
     * omit is reset to its default — this is not a partial patch. To change one
     * attribute, `getSchedule` first and resend the complete configuration with
     * that attribute modified, or you will silently erase `ScheduleExpression`,
     * `Target`, `Description`, `StartDate`, etc. The wrapper does not merge on
     * your behalf: deep-merging a `Target` (with its mutually-exclusive
     * target-type params) has no single correct semantics.
     *
     * At INFO the log line omits `Target.Input`; `POWERTOOLS_LOG_LEVEL=DEBUG`
     * unlocks the full input.
     */
    async updateSchedule(input: UpdateScheduleCommandInput): Promise<UpdateScheduleCommandOutput> {
        this.logger.info('Updating schedule', { input: redactTargetInput(this.logger, input) });
        return this.client.send(new UpdateScheduleCommand(input));
    }

    /**
     * Delete a schedule.
     */
    async deleteSchedule(input: DeleteScheduleCommandInput): Promise<DeleteScheduleCommandOutput> {
        this.logger.info('Deleting schedule', { input });
        return this.client.send(new DeleteScheduleCommand(input));
    }

    /**
     * List schedules, auto-paginating across all pages. Bounded in practice by
     * the account's schedule count and the `GroupName` / `NamePrefix` / `State`
     * filters, so the flat-array shape is safe.
     */
    async listSchedules(input?: ListSchedulesCommandInput): Promise<ScheduleSummary[]> {
        this.logger.info('Listing schedules', { input });
        const paginator = paginateListSchedules({ client: this.client }, input ?? {});
        const schedules: ScheduleSummary[] = [];
        for await (const page of paginator) {
            if (page.Schedules) schedules.push(...page.Schedules);
        }
        return schedules;
    }

    /**
     * Create a new schedule group. Groups are containers for schedules and are
     * typically IaC-managed; use this for dynamically-provisioned groups only.
     */
    async createScheduleGroup(
        input: CreateScheduleGroupCommandInput
    ): Promise<CreateScheduleGroupCommandOutput> {
        this.logger.info('Creating schedule group', { input });
        return this.client.send(new CreateScheduleGroupCommand(input));
    }

    /**
     * Fetch a schedule group's configuration.
     */
    async getScheduleGroup(
        input: GetScheduleGroupCommandInput
    ): Promise<GetScheduleGroupCommandOutput> {
        this.logger.info('Getting schedule group', { input });
        return this.client.send(new GetScheduleGroupCommand(input));
    }

    /**
     * Delete a schedule group. Deleting a group also deletes every schedule it
     * contains, asynchronously — the API has no `UpdateScheduleGroup`, so this
     * is the only mutating group operation besides create.
     */
    async deleteScheduleGroup(
        input: DeleteScheduleGroupCommandInput
    ): Promise<DeleteScheduleGroupCommandOutput> {
        this.logger.info('Deleting schedule group', { input });
        return this.client.send(new DeleteScheduleGroupCommand(input));
    }

    /**
     * List schedule groups, auto-paginating across all pages. Bounded in
     * practice by the account's group count and the `NamePrefix` filter.
     */
    async listScheduleGroups(
        input?: ListScheduleGroupsCommandInput
    ): Promise<ScheduleGroupSummary[]> {
        this.logger.info('Listing schedule groups', { input });
        const paginator = paginateListScheduleGroups({ client: this.client }, input ?? {});
        const groups: ScheduleGroupSummary[] = [];
        for await (const page of paginator) {
            if (page.ScheduleGroups) groups.push(...page.ScheduleGroups);
        }
        return groups;
    }
}
