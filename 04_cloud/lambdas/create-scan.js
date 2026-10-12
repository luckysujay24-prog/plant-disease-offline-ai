import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'PlantScans';

export const handler = async (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims.sub || event.headers?.['x-mock-user-id'] || 'anonymous-user';

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const payload = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    const { scanId, selectedCrop, predictedClass, confidence } = payload;

    if (!scanId || !selectedCrop || !predictedClass) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required scan fields: scanId, selectedCrop, predictedClass' }),
      };
    }

    // Idempotency check: see if record already exists
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { userId, scanId },
    }));

    if (existing.Item) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          message: 'Scan already recorded (idempotent duplicate)',
          scan: existing.Item,
          isDuplicate: true,
        }),
      };
    }

    const itemToSave = {
      userId,
      scanId,
      ...payload,
      syncedAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: itemToSave,
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: 'Scan synchronized successfully',
        scan: itemToSave,
        isDuplicate: false,
      }),
    };
  } catch (err) {
    console.error('CreateScan error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to record scan', details: err.message }),
    };
  }
};
