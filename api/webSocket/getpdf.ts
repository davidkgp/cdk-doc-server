import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
  S3Event,
} from "aws-lambda";
import { log } from "console";
import AWS, { S3 } from "aws-sdk";

const connectionTableName = process.env.CONNECTION_TABLE_NAME;
const urlTableName = process.env.URL_TABLE_NAME;
const s3 = new S3();

export const handleWebSocket = async (
  event: APIGatewayProxyEvent | S3Event,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    //for letting the gateway know everything is good and dandy
    const success = {
      body: "",
      statusCode: 200,
    };

    if ("Records" in event) {
      console.log("S3 Trigger");

      const docList = await Promise.all(
        event.Records.map((record) =>
          getSignedUrl(record.s3.bucket.name, record.s3.object.key)
        )
      );

      if (!connectionTableName) {
        throw new Error("tableName not specified in process.env.TABLE_NAME");
      }

      const ddb = new AWS.DynamoDB.DocumentClient({
        region: process.env.AWS_REGION,
      });

      const connectionData = await ddb
        .scan({
          TableName: connectionTableName,
          ProjectionExpression: "connectionId",
        })
        .promise();

      console.log(connectionData);

      connectionData.Items?.map(async ({ connectionId }) => {

        const connectionIdValue = JSON.parse(connectionId)[0];
        const url = JSON.parse(connectionId)[1];
        console.log(connectionIdValue);
        console.log(url);

        try {
          const apig = new AWS.ApiGatewayManagementApi({
            endpoint: url,
          });
          await apig
            .postToConnection({
              ConnectionId: connectionIdValue,
              Data: JSON.stringify(docList),
            })
            .promise();
        } catch (e) {
          if (e.statusCode === 410) {
            console.log(`Found stale connection, deleting ${connectionId}`);
            await ddb
              .delete({ TableName: connectionTableName, Key: { connectionId } })
              .promise();
          } else {
            throw e;
          }
        }
      });
    } else if ("requestContext" in event) {
      console.log("Gateway Trigger");

      const {
        requestContext: { connectionId, routeKey },
      } = event;

      console.log(connectionId);
      console.log(routeKey);

      if (routeKey === "getPDF") {
        console.log("handle new connection");

        if (!connectionTableName) {
          throw new Error("tableName not specified in process.env.TABLE_NAME");
        }

        const ddb = new AWS.DynamoDB.DocumentClient({
          region: process.env.AWS_REGION,
        });

        const connectionData = await ddb
          .scan({
            TableName: connectionTableName,
            ProjectionExpression: "connectionId",
          })
          .promise();

        const apig = new AWS.ApiGatewayManagementApi({
          endpoint:
            event.requestContext.domainName + "/" + event.requestContext.stage,
        });

        await Promise.all(
          (connectionData.Items ?? []).map(async ({ connectionId }) => {
            try {
              await apig
                .postToConnection({
                  ConnectionId: connectionId,
                  Data: JSON.stringify(["Hello", "world"]),
                })
                .promise();
            } catch (e) {
              if (e.statusCode === 410) {
                console.log(`Found stale connection, deleting ${connectionId}`);
                await ddb
                  .delete({
                    TableName: connectionTableName,
                    Key: { connectionId },
                  })
                  .promise();
              } else {
                throw e;
              }
            }
          })
        );
      } else {
        throw new Error(
          `Something bad happened. Unknown routekey : ${routeKey}`
        );
      }
    }

    return success;
  } catch (err) {
    console.error(err.message);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};

const getSignedUrl = async (
  bucketName: string,
  key: string
): Promise<{ fileName: string; fileUrl: string }> => {
  const url = await s3.getSignedUrlPromise("getObject", {
    Bucket: bucketName,
    Key: key,
    Expires: 60 * 60,
  });

  return {
    fileName: key,
    fileUrl: url,
  };
};
