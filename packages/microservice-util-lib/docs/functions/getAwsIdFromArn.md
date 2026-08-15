[**@aligent/microservice-util-lib**](../modules.md)

***

[@aligent/microservice-util-lib](../modules.md) / getAwsIdFromArn

# Function: getAwsIdFromArn()

> **getAwsIdFromArn**(`resourceArn`): `string`

Defined in: [packages/microservice-util-lib/src/get-aws-id-from-arn/get-aws-id-from-arn.ts:11](https://github.com/aligent/microservice-development-utilities/blob/b2c6889ec9b1af6e73d937636b016a21ca213617/packages/microservice-util-lib/src/get-aws-id-from-arn/get-aws-id-from-arn.ts#L11)

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
