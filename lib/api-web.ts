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
import { S3EventSource } from "@aws-cdk/aws-lambda-event-sources";
import * as s3 from '@aws-cdk/aws-s3';

interface DocWebSocketAPIProps {
  docBucket: s3.Bucket;
}

export class DocWebSocketAPI extends cdk.Construct {
  constructor(scope: cdk.Stack, id: string, props: DocWebSocketAPIProps) {
    super(scope, id);

    const connectionIdTable = new dynamodb.Table(this, 'MyWebsocketConnections', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
    });
    

    const fnConnect = new lambda.NodejsFunction(this, "WebDocConnectFunction", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "webSocket", "connect.ts"),
      handler: "handleWebSocket",
      environment: {
        CONNECTION_TABLE_NAME: connectionIdTable.tableName
      },
      bundling: {
        externalModules: [
          "aws-sdk" // Use the 'aws-sdk' available in the Lambda runtime
        ],
      }
    });

    connectionIdTable.grantReadWriteData(fnConnect);

    const fnDisconnect = new lambda.NodejsFunction(this, "WebDocDisconnectFunction", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "webSocket", "disconnect.ts"),
      handler: "handleWebSocket",
      environment: {
        CONNECTION_TABLE_NAME: connectionIdTable.tableName
      },
      bundling: {
        externalModules: [
          "aws-sdk" // Use the 'aws-sdk' available in the Lambda runtime
        ],
      }
    });

    connectionIdTable.grantReadWriteData(fnDisconnect);


    const fnGetPDF = new lambda.NodejsFunction(this, "WebDocPDFFunction", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "webSocket", "getpdf.ts"),
      handler: "handleWebSocket",
      environment: {
        CONNECTION_TABLE_NAME: connectionIdTable.tableName
      },
      bundling: {
        externalModules: [
          "aws-sdk" // Use the 'aws-sdk' available in the Lambda runtime
        ],
      }
    });


    connectionIdTable.grantReadWriteData(fnGetPDF);

    fnGetPDF.addEventSource(new S3EventSource(props.docBucket, {
      events: [ s3.EventType.OBJECT_CREATED]
    }));

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

    webSocketApi.addRoute('getPDF', {
      integration: new LambdaWebSocketIntegration({
        handler: fnGetPDF,
      }),
    });

    const webSocketStage = new WebSocketStage(this, 'mywebstage', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    new cdk.CfnOutput(this,"APiName", {
      value: webSocketStage.url,
      exportName: "WebSocketApiURL"

    });

    const url = `${webSocketStage.api.apiId}.execute-api.${webSocketStage.env.region}.amazonaws.com/${webSocketStage.stageName}`;

    fnGetPDF.addEnvironment("RESPONSE_URL",url);


    new cdk.CfnOutput(this,"WebSocketTable", {
      value: connectionIdTable.tableName,
      exportName: "WebSocketTable"

    });

    

    

    const connectionsArns = scope.formatArn({
      service: 'execute-api',
      resourceName: `${webSocketStage.stageName}/POST/*`,
      resource: webSocketApi.apiId,
    });
    

    const webSocketPermissions = new iam.PolicyStatement();
    webSocketPermissions.addResources(connectionsArns);
    webSocketPermissions.addActions(`execute-api:ManageConnections`);
    fnGetPDF.addToRolePolicy(webSocketPermissions);
    
  }
}
