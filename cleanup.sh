cdk destroy
aws s3 rm --recursive s3://$(aws s3 ls | grep cdktoolkit | cut -d' ' -f3) # empty the cdktoolkit staging bucket
aws cloudformation delete-stack --stack-name CDKToolkit