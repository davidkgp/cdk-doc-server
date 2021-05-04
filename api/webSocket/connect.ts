import {APIGatewayProxyEvent,Context,APIGatewayProxyResult} from "aws-lambda";
import { log } from "console";
import AWS from "aws-sdk";

const connectionTableName = process.env.TABLE_NAME;

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

    if (routeKey === "$connect") {
      console.log("handle new connection");


      if (!connectionTableName) {
        throw new Error('tableName not specified in process.env.TABLE_NAME');
      }

      const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
    
      const putParams = {
        TableName: connectionTableName,
        Item: {
          connectionId: event.requestContext.connectionId,
        },
      };
    
      try {
        await ddb.put(putParams).promise();
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

