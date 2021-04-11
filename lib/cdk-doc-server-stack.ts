
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { RemovalPolicy, Tags } from '@aws-cdk/core';
import * as path from 'path';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import {DocManagementAPI} from "./api";



export class CdkDocServerStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    const docStorageBucket = new Bucket(this, "DocBucket", 
    {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY
    });

    new cdk.CfnOutput(this,"DocBucketNameExport", {
      value: docStorageBucket.bucketName,
      exportName: "DocBucketName"

    });

    Tags.of(docStorageBucket).add('Object','MyDocBucket');


    new s3deploy.BucketDeployment(this, 'deployPDFs', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '..','pdfs'))],
      destinationBucket: docStorageBucket,
      retainOnDelete: false
    });



    const lambdaApi= new DocManagementAPI(this,"MyDocManagementAPI",{
      docBucket: docStorageBucket
    });


    Tags.of(lambdaApi).add('Module','MyDocLambda');


  }
}
