import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda-nodejs";
import { Runtime } from "@aws-cdk/aws-lambda";
import * as apig2 from "@aws-cdk/aws-apigatewayv2";
import { LambdaWebSocketIntegration } from "@aws-cdk/aws-apigatewayv2-integrations/lib/websocket";
import { WebSocketStage } from "@aws-cdk/aws-apigatewayv2";
import * as path from "path";

interface DocWebSocketAPIProps {}

export class DocWebSocketAPI extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props?: DocWebSocketAPIProps) {
    super(scope, id);

    const fn = new lambda.NodejsFunction(this, "MyWebSocketDocsFunction", {
      runtime: Runtime.NODEJS_12_X,
      entry: path.join(__dirname, "..", "api", "webSocket", "index.ts"),
      handler: "handleWebSocket",
      bundling: {
        externalModules: [
          "aws-sdk", // Use the 'aws-sdk' available in the Lambda runtime
        ],
      },
    });

    const webSocketApi = new apig2.WebSocketApi(this, "myDocWebSocket", {
      connectRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: fn,
        }),
      },
      disconnectRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: fn,
        }),
      },
      defaultRouteOptions: {
        integration: new LambdaWebSocketIntegration({
          handler: fn,
        }),
      },
    });

    new WebSocketStage(this, 'mywebstage', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    new cdk.CfnOutput(this,"APiName", {
      value: webSocketApi.apiEndpoint,
      exportName: "WebSocketApiURL"

    });
  }
}
