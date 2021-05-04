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

    if (routeKey === "getPDF") {
      console.log("handle new connection");


      if (!connectionTableName) {
        throw new Error('tableName not specified in process.env.TABLE_NAME');
      }

      const ddb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
    
      const connectionData = await ddb.scan({ TableName: connectionTableName
        , ProjectionExpression: 'connectionId' }).promise();

      const apig = new AWS.ApiGatewayManagementApi({
         endpoint: event.requestContext.domainName + '/' + event.requestContext.stage,
      });

        await Promise.all((connectionData.Items ?? []).map(async ({ connectionId }) => {
            try {
              await apig.postToConnection({ ConnectionId: connectionId, Data: JSON.stringify(["Hello","world"]) }).promise();
            } catch (e) {
              if (e.statusCode === 410) {
                console.log(`Found stale connection, deleting ${connectionId}`);
                await ddb.delete({ TableName: connectionTableName, Key: { connectionId } }).promise();
              } else {
                throw e;
              }
            }
          }));
      


 
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

