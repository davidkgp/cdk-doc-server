import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda-nodejs";
import { Runtime } from "@aws-cdk/aws-lambda";
import * as apig2 from "@aws-cdk/aws-apigatewayv2";
import { LambdaWebSocketIntegration } from "@aws-cdk/aws-apigatewayv2-integrations/lib/websocket";
import { WebSocketStage } from "@aws-cdk/aws-apigatewayv2";
import * as path from "path";
import * as iam from '@aws-cdk/aws-iam'
import { PolicyStatement } from "@aws-cdk/aws-iam";
import * as dynamodb from '@aws-cdk/aws-dynamodb';

interface DocWebSocketAPIProps {}

export class DocWebSocketAPI extends cdk.Construct {
  constructor(scope: cdk.Stack, id: string, props?: DocWebSocketAPIProps) {
    super(scope, id);

    const connectionIdTable = new dynamodb.Table(this, 'MyWebsocketConnections', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
    });

    

    const fnConnect = new lambda.NodejsFunction(this, "MyWebSocketDocConnectFunction", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "webSocket", "connect.ts"),
      handler: "handleWebSocket",
      environment: {
        TABLE_NAME: connectionIdTable.tableName,
      },
      bundling: {
        externalModules: [
          "aws-sdk" // Use the 'aws-sdk' available in the Lambda runtime
        ],
      }
    });

    connectionIdTable.grantReadWriteData(fnConnect);

    const fnDisconnect = new lambda.NodejsFunction(this, "MyWebSocketDocDisconnectFunction", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "webSocket", "disconnect.ts"),
      handler: "handleWebSocket",
      environment: {
        TABLE_NAME: connectionIdTable.tableName,
      },
      bundling: {
        externalModules: [
          "aws-sdk" // Use the 'aws-sdk' available in the Lambda runtime
        ],
      }
    });

    connectionIdTable.grantReadWriteData(fnDisconnect);


    // const fnGetPDF = new lambda.NodejsFunction(this, "MyWebSocketDocPDFFunction", {
    //   runtime: Runtime.NODEJS_12_X,
    //   entry: path.join(__dirname, "..", "api", "webSocket", "getpdf.ts"),
    //   handler: "handleWebSocket",
    //   bundling: {
    //     externalModules: [
    //       "aws-sdk" // Use the 'aws-sdk' available in the Lambda runtime
    //     ],
    //   }
    // });

    const webSocketApi = new apig2.WebSocketApi(this, "myDocWebSocket", {
      connectRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: fnConnect,
        }),
      },
      disconnectRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: fnDisconnect,
        }),
      }
    });

    // webSocketApi.addRoute('getPDF', {
    //   integration: new LambdaWebSocketIntegration({
    //     handler: fnGetPDF,
    //   }),
    // });

    const webSocketStage = new WebSocketStage(this, 'mywebstage', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    new cdk.CfnOutput(this,"APiName", {
      value: webSocketApi.apiEndpoint,
      exportName: "WebSocketApiURL"

    });

    const connectionsArns = scope.formatArn({
      service: 'execute-api',
      resourceName: `${webSocketStage.stageName}/POST/*`,
      resource: webSocketApi.apiId,
    });

    // fn.addToRolePolicy(
    //   new PolicyStatement({ actions: ['execute-api:ManageConnections'], resources: [connectionsArns] })
    // );

    // const bucketPermissions = new iam.PolicyStatement();
    // bucketPermissions.addResources(connectionsArns);
    // bucketPermissions.addActions(`execute-api:ManageConnections`);
    // fnGetPDF.addToRolePolicy(bucketPermissions);
    
  }
}
