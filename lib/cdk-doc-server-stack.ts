import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as lambda from '@aws-cdk/aws-lambda';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { RemovalPolicy, Tags } from '@aws-cdk/core';
import * as path from 'path';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';


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

    const fn = new lambda.Function(this, 'MyDocRetrieveFunction', {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '..','api','getDoc')),
    });

    Tags.of(fn).add('Object','MyDocLambda');


    const docsDefaultIntegration = new LambdaProxyIntegration({
      handler: fn,
    });
    
    const httpApi = new HttpApi(this, 'HttpApi');
    
    httpApi.addRoutes({
      path: '/docs',
      methods: [ HttpMethod.GET ],
      integration: docsDefaultIntegration,
    });

    new cdk.CfnOutput(this,"APiName", {
      value: httpApi.apiEndpoint,
      exportName: "HttpAPIUrl"

    });

    

  }
}
