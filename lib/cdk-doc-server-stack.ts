import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';

export class CdkDocServerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const docStorageBucket = new Bucket(this, "DocBucket", 
    {
      encryption: BucketEncryption.S3_MANAGED
    });

    new cdk.CfnOutput(this,"DocBucketNameExport", {
      value: docStorageBucket.bucketName,
      exportName: "DocBucketName"

    })

  }
}
