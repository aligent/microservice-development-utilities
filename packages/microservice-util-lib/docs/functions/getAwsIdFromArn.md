[**@aligent/microservice-util-lib**](../modules.md) • **Docs**

---

[@aligent/microservice-util-lib](../modules.md) / getAwsIdFromArn

# Function: getAwsIdFromArn()

> **getAwsIdFromArn**(`resourceArn`): `string`

Get the AWS ID from its resource ARN

## Parameters

• **resourceArn**: `string`

the ARN of the AWS resource

## Returns

`string`

the ID (if present in the ARN) of the AWS resource/execution

## Throws

when the provided ARN is empty

## Example

```ts
getAwsIdFromArn(
  'arn:aws:states:ap-southeast-2:123123123:execution:prj-int-entity-ac-dc-dev-machine-name:this-is-the-id'
);
```

## Defined in

[get-aws-id-from-arn/get-aws-id-from-arn.ts:11](https://github.com/aligent/microservice-development-utilities/blob/6029aa3ed377277764d6a6f496cad1ea8d56a51e/packages/microservice-util-lib/src/get-aws-id-from-arn/get-aws-id-from-arn.ts#L11)
