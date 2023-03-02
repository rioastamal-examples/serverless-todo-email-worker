const dummySqsBody = process.env.APP_DUMMY_SQS_BODY || undefined;
if (dummySqsBody === undefined) {
  console.error('Missing APP_DUMMY_SQS_BODY env.');
  process.exit(1);
}

const handler = require('./src/handlers/main.js');
const unixTimestamp = Math.floor(Date.now() / 1000);
const dummyContext = {
  functionName: 'dummy-function-name-' + unixTimestamp,
  functionVersion: '$LATEST',
  awsRequestId: 'dummy-request-id-' + unixTimestamp
}
const dummyEvent = require('./event-sqs.sample.json');
dummyEvent.Records[0].body = dummySqsBody;
console.log('dummyEvent', JSON.stringify(dummyEvent, null, 2));

handler.welcomeEmailSender(dummyEvent, dummyContext)
  .then(() => console.log('Email sent'))
  .catch(e => console.log('ERROR: ', e.toString()));