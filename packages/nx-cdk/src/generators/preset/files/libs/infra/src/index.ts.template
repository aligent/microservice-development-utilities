import { Stack, Stage, type StackProps } from 'aws-cdk-lib';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';

export interface SharedInfraProps {
    eCommerceBaseUrl: string;
    eCommerceCredentials: Secret;
}

export class SharedInfraStack extends Stack {
    readonly eCommerceBaseUrl: string;
    readonly eCommerceCredentials: Secret;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const STAGE = Stage.of(this)?.stageName;
        if (!STAGE) {
            throw new Error('This construct must be used within a CDK Stage');
        }

        const applicationName = this.node.tryGetContext('NAME');

        this.eCommerceBaseUrl = StringParameter.fromStringParameterName(
            this,
            'ECommerceBaseUrl',
            `/${applicationName}/e-commerce/base-url`
        ).stringValue;

        // Create secrets once in the shared stack
        this.eCommerceCredentials = new Secret(this, 'ECommerceCredentials', {
            secretName: `${applicationName}/e-commerce-credentials`,
            description: 'E-Commerce API credentials shared across services',
        });
    }

    getProps(): SharedInfraProps {
        return {
            eCommerceBaseUrl: this.eCommerceBaseUrl,
            eCommerceCredentials: this.eCommerceCredentials,
        };
    }
}
