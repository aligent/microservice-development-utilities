import getAwsIdFromArn from './get-aws-id-from-arn';

describe('getAWsIdFromArn', () => {
  it('should return the short execution ID when given a valid ARN', () => {
    expect(
      getAwsIdFromArn(
        'arn:aws:states:ap-southeast-2:123123123:execution:prj-int-entity-ac-dc-dev-machine-name:this-is-the-id'
      )
    ).toEqual('this-is-the-id');
  });

  it('should throw an error when an empty string is given', () => {
    expect(() => {
      getAwsIdFromArn('');
    }).toThrowError('Received an empty resourceArn, unable to get an ID.');
  });

  it('returns the provided string where it is assumed to be already a short ID',
    () => {
      expect(getAwsIdFromArn('my-execution')).toEqual('my-execution');
    });
});
