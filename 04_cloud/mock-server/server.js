/**
 * server.js
 * Zero-dependency Mock Cloud API Server for offline sync testing and fault injection.
 * Implemented using Node.js built-in 'node:http'.
 */

import http from 'node:http';

const PORT = process.env.MOCK_SERVER_PORT || 4000;

// In-memory store: scanId -> scanRecord
export const scansStore = new Map();

// Fault-injection configuration
export const faultConfig = {
  failureRate: 0.0,
  injectedLatencyMs: 0,
  disconnectMidRequest: false,
};

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-mock-user-id');
}

export function createServer() {
  return http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (faultConfig.injectedLatencyMs > 0) {
      await new Promise(r => setTimeout(r, faultConfig.injectedLatencyMs));
    }

    if (faultConfig.disconnectMidRequest) {
      req.socket.destroy();
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // Helper to read JSON body
    const readBody = () => new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

    // Endpoints

    // GET /health
    if (req.method === 'GET' && pathname === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // GET /admin/faults
    if (req.method === 'GET' && pathname === '/admin/faults') {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify(faultConfig));
      return;
    }

    // POST /admin/faults
    if (req.method === 'POST' && pathname === '/admin/faults') {
      const body = await readBody();
      if (typeof body.failureRate === 'number') faultConfig.failureRate = body.failureRate;
      if (typeof body.injectedLatencyMs === 'number') faultConfig.injectedLatencyMs = body.injectedLatencyMs;
      if (typeof body.disconnectMidRequest === 'boolean') faultConfig.disconnectMidRequest = body.disconnectMidRequest;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Fault config updated', faultConfig }));
      return;
    }

    // POST /admin/reset
    if (req.method === 'POST' && pathname === '/admin/reset') {
      scansStore.clear();
      faultConfig.failureRate = 0.0;
      faultConfig.injectedLatencyMs = 0;
      faultConfig.disconnectMidRequest = false;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ message: 'Store and fault settings reset' }));
      return;
    }

    // Injected transient failures for api endpoints
    if (Math.random() < faultConfig.failureRate) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Injected transient server failure' }));
      return;
    }

    // POST /scans (Idempotent scan ingestion)
    if (req.method === 'POST' && pathname === '/scans') {
      const body = await readBody();
      const { scanId } = body;
      if (!scanId) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'scanId is required' }));
        return;
      }

      // Idempotency: return existing if present
      if (scansStore.has(scanId)) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          message: 'Scan already recorded (idempotent duplicate)',
          scan: scansStore.get(scanId),
          isDuplicate: true,
        }));
        return;
      }

      const newScan = {
        ...body,
        userId: req.headers['x-mock-user-id'] || 'mock-cognito-farmer-123',
        savedAtServer: new Date().toISOString(),
      };
      scansStore.set(scanId, newScan);

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 201;
      res.end(JSON.stringify({
        message: 'Scan recorded successfully',
        scan: newScan,
        isDuplicate: false,
      }));
      return;
    }

    // POST /scans/:scanId/upload-url
    if (req.method === 'POST' && pathname.startsWith('/scans/') && pathname.endsWith('/upload-url')) {
      const parts = pathname.split('/');
      const scanId = parts[2];
      const host = req.headers.host || `localhost:${PORT}`;
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({
        uploadUrl: `http://${host}/mock-s3-upload/${scanId}`,
        key: `scans/${scanId}.jpg`,
        expiresInSeconds: 300,
      }));
      return;
    }

    // PUT /mock-s3-upload/:scanId (Mock S3 PUT)
    if (req.method === 'PUT' && pathname.startsWith('/mock-s3-upload/')) {
      req.on('data', () => {});
      req.on('end', () => {
        res.statusCode = 200;
        res.end();
      });
      return;
    }

    // GET /scans (List scans)
    if (req.method === 'GET' && pathname === '/scans') {
      const scans = Array.from(scansStore.values());
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ scans, count: scans.length }));
      return;
    }

    // 404
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });
}

const server = createServer();

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  server.listen(PORT, () => {
    console.log(`Mock Cloud API Server running on http://localhost:${PORT}`);
  });
}

export default server;
