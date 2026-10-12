export const handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      status: 'ok',
      service: 'plant-disease-offline-ai-cloud',
      region: process.env.AWS_REGION || 'local',
      timestamp: new Date().toISOString(),
    }),
  };
};
