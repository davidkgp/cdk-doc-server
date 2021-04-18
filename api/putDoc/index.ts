import S3 from "aws-sdk/clients/s3";
import {APIGatewayProxyEvent,Context,APIGatewayProxyResult} from "aws-lambda";
import * as parser from "lambda-multipart-parser";


const s3 = new S3();
const bucketName = process.env.MY_DOC_BUCKETNAME;

export const handlePut = async (event: APIGatewayProxyEvent,context:Context): Promise<APIGatewayProxyResult> => {
  try {
    console.log(`Bucket Name :${bucketName}`);

    const result = await parser.parse(event);

    const { content, filename, contentType } = result.files[0];
    
    const returnObject = await s3
      .upload({
        Bucket: bucketName!,
        Key: filename,
        Body: content,
        ContentType: contentType
      })
      .promise();

      const docUrl = Promise.resolve(returnObject).then((returnObj)=>getSignedUrl(returnObj));


    return{
        statusCode: 200,
        body: JSON.stringify(docUrl)
    };
  } catch (err) {
      return{
          statusCode: 500,
          body: err.message
      };
  }
};


const getSignedUrl = async (doc: S3.ManagedUpload.SendData): Promise<{fileName:string, fileUrl:string}> =>{
    const url = await s3.getSignedUrlPromise(
        'getObject',
        {
            Bucket: doc.Bucket,
            Key: doc.Key,
            Expires: (60*60)

        });

        return{
            fileName: doc.Key!,
            fileUrl: url
        };
}

