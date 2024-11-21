/**
 * Get the AWS ID from its resource ARN
 * @param resourceArn the ARN of the AWS resource
 * @returns the ID (if present in the ARN) of the AWS resource/execution
 * @throws when the provided ARN is empty
 * @example
 * ```ts
 * getAwsIdFromArn('arn:aws:states:ap-southeast-2:123123123:execution:prj-int-entity-ac-dc-dev-machine-name:this-is-the-id')
 * ```
 */
const getAwsIdFromArn = (resourceArn: string): string => {
    if (resourceArn.length === 0) {
        throw new Error('Received an empty resourceArn, unable to get an ID.');
    }
    const startIdx = resourceArn.lastIndexOf(':') + 1;
    return resourceArn.substring(startIdx);
};
export default getAwsIdFromArn;
