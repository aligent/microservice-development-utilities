[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / getAwsIdFromArn

# Function: getAwsIdFromArn()

> **getAwsIdFromArn**(`resourceArn`): `string`

Defined in: [packages/microservice-util-lib/src/get-aws-id-from-arn/get-aws-id-from-arn.ts:11](https://github.com/aligent/microservice-development-utilities/blob/c4dce53ca953648ae0b3bf4b11ed6a027ecdec50/packages/microservice-util-lib/src/get-aws-id-from-arn/get-aws-id-from-arn.ts#L11)

Get the AWS ID from its resource ARN

## Parameters

### resourceArn

`string`

the ARN of the AWS resource

## Returns

`string`

the ID (if present in the ARN) of the AWS resource/execution

## Throws

when the provided ARN is empty

## Example

```ts
getAwsIdFromArn('arn:aws:states:ap-southeast-2:123123123:execution:prj-int-entity-ac-dc-dev-machine-name:this-is-the-id')
```
