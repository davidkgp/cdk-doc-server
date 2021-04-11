import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { Bucket, BucketEncryption } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { RemovalPolicy, Tags } from '@aws-cdk/core';
import * as path from 'path';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import { isMainThread } from 'worker_threads';
import * as iam from '@aws-cdk/aws-iam'



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

    const fn = new lambda.NodejsFunction(this, 'MyGetDocsFunction', {
      entry: path.join(__dirname, '..','api','getDocTS','index.ts'), 
      handler: 'handler',
      bundling:{
        externalModules: [
          'aws-sdk' // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
      environment :{
        MY_DOC_BUCKETNAME:docStorageBucket.bucketName
      }
      
    });

    const bucketPermissions = new iam.PolicyStatement();
    bucketPermissions.addResources(`${docStorageBucket.bucketArn}/*`);
    bucketPermissions.addActions(`s3:GetObject`,`s3:PutObject`);
    fn.addToRolePolicy(bucketPermissions);

    const bucketContainerPermissions = new iam.PolicyStatement();
    bucketContainerPermissions.addResources(docStorageBucket.bucketArn);
    bucketContainerPermissions.addActions(`s3:ListBucket`);
    fn.addToRolePolicy(bucketContainerPermissions);

    Tags.of(fn).add('Object','MyDocLambda');



    const getDocsDefaultIntegration = new LambdaProxyIntegration({
      handler: fn,
    });
    
    const httpApi = new HttpApi(this, 'HttpApi');
    
    httpApi.addRoutes({
      path: '/docs',
      methods: [ HttpMethod.GET ],
      integration: getDocsDefaultIntegration,
    });

    new cdk.CfnOutput(this,"APiName", {
      value: httpApi.apiEndpoint,
      exportName: "HttpAPIUrl"

    });

    

  }
}
