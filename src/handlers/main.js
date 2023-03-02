/**
 * A Lambda function that send welcome email to the user. Data should coming
 * from SQS event.
 * 
 * Sample SQS event
 * ================
 * {
 *     "Records": [
 *         {
 *             "messageId": "059f36b4-87a3-44ab-83d2-661975830a7d",
 *             "receiptHandle": "AQEBwJnKyrHigUMZj6rYigCgxlaS3SLy0a...",
 *             "body": "{ \"username\": \"rioastamal\" }",
 *             "attributes": {
 *                 "ApproximateReceiveCount": "1",
 *                 "SentTimestamp": "1545082649183",
 *                 "SenderId": "AIDAIENQZJOLO23YVJ4VO",
 *                 "ApproximateFirstReceiveTimestamp": "1545082649185"
 *             },
 *             "messageAttributes": {},
 *             "md5OfBody": "098f6bcd4621d373cade4e832627b4f6",
 *             "eventSource": "aws:sqs",
 *             "eventSourceARN": "arn:aws:sqs:us-east-2:123456789012:my-queue",
 *             "awsRegion": "us-east-2"
 *         }
 *     ]
 * }
 */
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const tableName = process.env.APP_TABLE_NAME;
const ddbclient = new DynamoDBClient({ region: process.env.APP_REGION || 'ap-southeast-1' });
const sesclient = new SESClient({ region: process.env.APP_REGION || 'ap-southeast-1' });
const appUrl = process.env.APP_URL || 'https://REPLACE_THIS_VIA_ENV/';
const fromEmailAddr = process.env.APP_FROM_EMAIL_ADDR || undefined;

exports.welcomeEmailSender = async (event, context) => {
  const { username } = JSON.parse(event.Records[0].body);
  const existingUserParam = {
      TableName: tableName,
      Key: marshall({
          pk: `user#${username}`,
          sk: `user`
      })
  };
  
  const existingUserResponse = await ddbclient.send(new GetItemCommand(existingUserParam));
  
  if (existingUserResponse.Item === undefined) {
    return 'No record found associated with the user ' + username;
  }
  const userItem = unmarshall(existingUserResponse.Item);
  console.log(userItem);
  
  const now = new Date().toISOString();
  const body = {
    Text: {
      Charset: 'UTF-8',
      Data: `Hello ${userItem.data.fullname},

Welcome to the Serverless Todos!. Enjoy your free todo app at ${appUrl}.

Cheers,
Serverless Todos team

METADATA:
- Server date: ${now}
- Function name: ${context.functionName}
- Function version: ${context.functionVersion}
- Request Id: ${context.awsRequestId}
`
    },
    
    Html: {
      Charset: 'UTF-8',
      Data: `<html><body>
<p>Hello <b>${userItem.data.fullname}</b>,<p>

<p>Welcome to the Serverless Todos!. 
Enjoy your free todo app at <a href="${appUrl}">our website</a>.</p>

<p>Cheers,<br>
Serverless Todos team</p>

<b>METADATA</b>
<ul>
  <li>Server date: ${now}</li>
  <li>Function name: ${context.functionName}</li>
  <li>Function version: ${context.functionVersion}</li>
  <li>Request Id: ${context.awsRequestId}</li>
</ul>
</body></html>
`
    }
  };
  const subject = {
    Charset: 'UTF-8',
    Data: 'Welcome to Serverless Todo'
  };
  const destination = { ToAddresses: [userItem.data.email] };
  
  const sendEmailParam = {
    Destination: destination,
    Source: fromEmailAddr,
    Message: {
      Subject: subject,
      Body: body
    }
  };
  
  console.log('sendEmailParam', sendEmailParam);
  const mailResponse = await sesclient.send(new SendEmailCommand(sendEmailParam));
  console.log('mailResponse', mailResponse);

  return 'Message sent to ' + username;
}