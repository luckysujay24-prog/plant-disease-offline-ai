import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || 'crop-health-images';

export const handler = async (event) => {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const userId = claims.sub || event.headers?.['x-mock-user-id'] || 'anonymous-user';
    const scanId = event.pathParameters?.scanId;

    if (!scanId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'scanId is required in path' }),
      };
    }

    const key = `users/${userId}/scans/${scanId}.jpg`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: 'image/jpeg',
    });

    // 5 minutes URL expiry
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        uploadUrl,
        key,
        expiresInSeconds: 300,
      }),
    };
  } catch (err) {
    console.error('GetUploadUrl error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to generate upload URL', details: err.message }),
    };
  }
};
