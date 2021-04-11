import S3 from "aws-sdk/clients/s3";
import {APIGatewayProxyEvent,Context,APIGatewayProxyResult} from "aws-lambda";

const s3 = new S3();
const bucketName = process.env.MY_DOC_BUCKETNAME;

export const handler = async (event: APIGatewayProxyEvent,context:Context): Promise<APIGatewayProxyResult> => {
  try {
    console.log(`Bucket Name :${bucketName}`);
    const { Contents: docs } = await s3
      .listObjects({
        Bucket: bucketName!,
      })
      .promise();

    const docList = await Promise.all(docs!.map(doc=>getSignedUrl(doc)));

    console.log("Hello World!");
    console.log(JSON.stringify(docList));

    return{
        statusCode: 200,
        body: JSON.stringify(docList)
    };
  } catch (err) {
      return{
          statusCode: 500,
          body: err.message
      };
  }
};
const getSignedUrl = async (doc: S3.Object): Promise<{fileName:string, fileUrl:string}> =>{
    const url = await s3.getSignedUrlPromise(
        'getObject',
        {
            Bucket: bucketName,
            Key: doc.Key,
            Expires: (60*60)

        });

        return{
            fileName: doc.Key!,
            fileUrl: url
        };
}

