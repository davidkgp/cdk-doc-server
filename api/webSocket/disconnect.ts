import {APIGatewayProxyEvent,Context,APIGatewayProxyResult} from "aws-lambda";
import { log } from "console";
import AWS from "aws-sdk";

const connectionTableName = process.env.CONNECTION_TABLE_NAME;

export const handleWebSocket = async (event: APIGatewayProxyEvent,context:Context): Promise<APIGatewayProxyResult> => {
  try {

   //for letting the gateway know everything is good and dandy
    const success = {
      body: "",
      statusCode: 200
    }


    const {
      requestContext: { connectionId, routeKey },
    } = event;

    console.log(connectionId);
    console.log(routeKey);

    if (routeKey === "$disconnect") {
      console.log("handle disconnection");

      if (!connectionTableName) {
        throw new Error('tableName not specified in process.env.TABLE_NAME');
      }

      const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
      const url = event.requestContext.domainName + '/' + event.requestContext.stage;
    
      const deleteParams = {
        TableName: connectionTableName,
        Key: {
          connectionId: JSON.stringify([event.requestContext.connectionId,url])
        },
      };
    
      try {
        await ddb.delete(deleteParams).promise();
      } catch (err) {
        return { statusCode: 500, body: 'Failed to connect: ' + JSON.stringify(err) };
      }

 
    }else{
        throw new Error(`Something bad happened. Unknown routekey : ${routeKey}`);
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

