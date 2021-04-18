import {APIGatewayProxyEvent,Context,APIGatewayProxyResult} from "aws-lambda";

export const handleWebSocket = async (event: APIGatewayProxyEvent,context:Context): Promise<APIGatewayProxyResult> => {
  try {

    const {
      requestContext: { connectionId, routeKey },
    } = event;

    if (routeKey === "$connect") {
      // handle new connection
      return {
        body: JSON.stringify(['hello', 'world', 'connect']),
        statusCode: 200
      }
    }
      
    if (routeKey === "$disconnect") {
      // handle disconnection
      return {
        body: JSON.stringify(['hello', 'world', 'disconnect']),
        statusCode: 200
      }
    }



    return{
        statusCode: 200,
        body: JSON.stringify(['hello', 'world'])
    };
  } catch (err) {
      return{
          statusCode: 500,
          body: err.message
      };
  }
};