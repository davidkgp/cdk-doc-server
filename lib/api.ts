import * as cdk from "@aws-cdk/core"
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from "@aws-cdk/aws-lambda";
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam'
import * as apig2 from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { CorsHttpMethod } from "@aws-cdk/aws-apigatewayv2";

interface DocManagementAPIProps{

    docBucket: s3.IBucket;

}

export class DocManagementAPI extends cdk.Construct{

    constructor(scope:cdk.Construct ,id: string , props:DocManagementAPIProps){
        super(scope,id);

        const fn = new lambda.NodejsFunction(this, 'MyGetDocsFunction', {
            runtime: Runtime.NODEJS_12_X,
            entry: path.join(__dirname, '..','api','getDocTS','index.ts'), 
            handler: 'handler',
            bundling:{
              externalModules: [
                'aws-sdk' // Use the 'aws-sdk' available in the Lambda runtime
              ],
            },
            environment :{
              MY_DOC_BUCKETNAME:props.docBucket.bucketName
            }
            
          });

          const bucketPermissions = new iam.PolicyStatement();
          bucketPermissions.addResources(`${props.docBucket.bucketArn}/*`);
          bucketPermissions.addActions(`s3:GetObject`,`s3:PutObject`);
          fn.addToRolePolicy(bucketPermissions);
      
          const bucketContainerPermissions = new iam.PolicyStatement();
          bucketContainerPermissions.addResources(props.docBucket.bucketArn);
          bucketContainerPermissions.addActions(`s3:ListBucket`);
          fn.addToRolePolicy(bucketContainerPermissions);


          const getDocsDefaultIntegration = new LambdaProxyIntegration({
            handler: fn,
          });
          
          const httpApi = new apig2.HttpApi(this, 'HttpApi',{
              apiName: "MyDocsAPI",
              corsPreflight:{
                allowMethods: [CorsHttpMethod.GET],
                maxAge: cdk.Duration.days(2)
              }

          });
          
          httpApi.addRoutes({
            path: '/docs',
            methods: [ apig2.HttpMethod.GET ],
            integration: getDocsDefaultIntegration,
          });
      
          new cdk.CfnOutput(this,"APiName", {
            value: httpApi.apiEndpoint,
            exportName: "HttpAPIUrl"
      
          });
    }

}


