import {APIGatewayProxyEvent,Context,APIGatewayProxyResult} from "aws-lambda";
import { log } from "console";
import AWS from "aws-sdk";

export const handleWebSocket = async (event: APIGatewayProxyEvent,context:Context): Promise<APIGatewayProxyResult> => {
  try {

    const url="https://" + event.requestContext.domainName 
    + "/"+event.requestContext.stage;


    const apig = new AWS.ApiGatewayManagementApi({
      endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
    });


    //for letting the gateway know everything is good and dandy
    const success = {
      body: "",
      statusCode: 200
    }

    console.log(apig.endpoint);

    console.log(event);
    console.log(context);

    const {
      requestContext: { connectionId, routeKey },
    } = event;

    console.log(connectionId);
    console.log(routeKey);

    if (routeKey === "$connect") {
      console.log("handle new connection");
      await apig
      .postToConnection({
        Data: JSON.stringify(['hello', 'world', 'connect']),
        ConnectionId: connectionId!
      })
      .promise();   
    }
      
    if (routeKey === "$disconnect") {
      console.log("handle disconnection");
      await apig
      .postToConnection({
        Data: JSON.stringify(['hello', 'world', 'disconnect']),
        ConnectionId: connectionId!
      })
      .promise();
    }

    if (routeKey === "$default") {
      console.log("handle disconnection");
      await apig
      .postToConnection({
        Data: JSON.stringify(['hello', 'world', 'default']),
        ConnectionId: connectionId!
      })
      .promise();
    }

    return success;
   
  } catch (err) {
      console.error(err.message);
      return{
          statusCode: 500,
          body: err.message
      };
  }
};

