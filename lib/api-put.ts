import * as cdk from "@aws-cdk/core"
import * as lambda from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from "@aws-cdk/aws-lambda";
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as iam from '@aws-cdk/aws-iam'
import * as apig from '@aws-cdk/aws-apigateway';


interface DocPutAPIProps{

    docBucket: s3.IBucket;

}

export class DocPutAPI extends cdk.Construct{

    constructor(scope:cdk.Construct ,id: string , props:DocPutAPIProps){
        super(scope,id);

        const fn = new lambda.NodejsFunction(this, 'MyGetDocsFunction', {
            runtime: Runtime.NODEJS_12_X,
            entry: path.join(__dirname, '..','api','putDoc','index.ts'), 
            handler: 'handlePut',
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


          const postDocsDefaultIntegration = new apig.LambdaIntegration(fn);
          
          const httpApi = new apig.RestApi(this, 'HttpPutApi',{
              description: "MyDocsPutAPI",
              binaryMediaTypes: ["multipart/form-data"]

          });

          httpApi.root.addMethod('ANY');
          const doc =httpApi.root.addResource("doc");
          doc.addMethod("POST",postDocsDefaultIntegration);
          doc.addCorsPreflight({

            allowOrigins: ["POST"],
            maxAge: cdk.Duration.days(2)

          });
          

      
          new cdk.CfnOutput(this,"APiPutName", {
            value: httpApi.url,
            exportName: "HttpPutAPIUrl"
      
          });
    }

}


