import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'PlantScans';

export const handler = async (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims.sub || event.headers?.['x-mock-user-id'] || 'anonymous-user';

    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: {
        ':u': userId,
      },
      ScanIndexForward: false, // Newest first
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        scans: result.Items || [],
        count: result.Count || 0,
      }),
    };
  } catch (err) {
    console.error('ListScans error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to list scans', details: err.message }),
    };
  }
};
