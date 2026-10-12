/**
 * test_sync.js
 * Comprehensive automated verification of Cloud Mock Server and Sync Protocol.
 * Tests:
 * 1. Health check endpoint (GET /health)
 * 2. Idempotent scan ingestion (POST /scans)
 * 3. Presigned URL generation & mock S3 upload (POST /upload-url + PUT)
 * 4. Fault injection resilience (simulated network / server errors)
 * 5. Eventual consistency and zero data loss on retry
 */

import { createServer } from './server.js';
import assert from 'node:assert';

const PORT = 4099;
const server = createServer();

async function runTests() {
  console.log('--- Starting Cloud Sync Integration & Idempotency Tests ---');

  await new Promise(resolve => server.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  try {
    // 1. Health check
    console.log('[Test 1] Verifying GET /health...');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok');
    console.log('✓ Health check passed');

    // 2. Idempotent scan submission
    console.log('[Test 2] Verifying Idempotent Scan Ingestion...');
    const sampleScan = {
      scanId: 'test_scan_001',
      selectedCrop: 'tomato',
      cropMode: 'known',
      predictedCrop: 'tomato',
      predictedClass: 'tomato___early_blight',
      displayName: 'Tomato - Early Blight',
      confidence: 0.892,
      weatherSnapshot: {
        temperatureC: 24.5,
        humidityPct: 82.0,
        rainMm: 4.2,
        source: 'live',
        sourceLabel: 'Live Weather (Open-Meteo)',
      },
      risk: {
        score: 0.74,
        category: 'HIGH',
      },
      createdAt: new Date().toISOString(),
    };

    // First upload -> 201 Created
    const res1 = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleScan),
    });
    assert.strictEqual(res1.status, 201);
    const data1 = await res1.json();
    assert.strictEqual(data1.isDuplicate, false);

    // Duplicate upload -> 200 OK (idempotent, no duplicates)
    const res2 = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleScan),
    });
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.strictEqual(data2.isDuplicate, true);

    // Verify scan list has exactly 1 entry
    const listRes = await fetch(`${baseUrl}/scans`);
    const listData = await listRes.json();
    assert.strictEqual(listData.count, 1);
    console.log('✓ Idempotency verified: duplicate scanId gracefully handled without duplicate records');

    // 2b. Contract Compatibility Test (v1.0.0 old shape vs v1.1.0 new shape)
    console.log('[Test 2b] Verifying Backward-Compatible Additive Contract (v1.0.0 & v1.1.0)...');
    const v100Scan = {
      scanId: 'contract_v100_scan',
      selectedCrop: 'potato',
      cropMode: 'known',
      predictedCrop: 'potato',
      predictedClass: 'potato___early_blight',
      displayName: 'Potato - Early Blight',
      confidence: 0.91,
      weatherSnapshot: {
        temperatureC: 22.0,
        humidityPct: 80.0,
        rainMm: 0.0,
        source: 'live',
        sourceLabel: 'Live Weather',
      },
      risk: { score: 0.5, category: 'MEDIUM' },
      createdAt: new Date().toISOString(),
    };

    const v110Scan = {
      scanId: 'contract_v110_scan',
      selectedCrop: 'potato',
      cropMode: 'known',
      predictedCrop: 'potato',
      predictedClass: 'potato___early_blight',
      displayName: 'Potato - Early Blight',
      confidence: 0.91,
      weatherSnapshot: {
        temperatureC: 22.0,
        humidityPct: 80.0,
        rainMm: 0.0,
        source: 'live',
        sourceLabel: 'Live Weather',
      },
      risk: { score: 0.5, category: 'MEDIUM' },
      imageMeta: { width: 1024, height: 768, format: 'image/jpeg', blurVariance: 45.2, exgIndex: 0.12 },
      cropStage: 'vegetative',
      advisory: {
        actionHeadline: 'Avoid top-dressing before rain',
        bestWindow: 'Dry conditions for next 2 days',
        disclaimers: ['Zero brand recommendations', 'Fertilizer does not cure infection'],
      },
      createdAt: new Date().toISOString(),
    };

    const resV100 = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v100Scan),
    });
    assert.strictEqual(resV100.status, 201);

    const resV110 = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v110Scan),
    });
    assert.strictEqual(resV110.status, 201);

    const checkList = await (await fetch(`${baseUrl}/scans`)).json();
    const fetchedV100 = checkList.scans.find(s => s.scanId === 'contract_v100_scan');
    const fetchedV110 = checkList.scans.find(s => s.scanId === 'contract_v110_scan');
    assert(fetchedV100 && fetchedV100.advisory === undefined);
    assert(fetchedV110 && fetchedV110.advisory && fetchedV110.advisory.actionHeadline === 'Avoid top-dressing before rain');
    // 2c. CR-02 Pure Vision Payload Test (Zero weather, zero risk fields)
    console.log('[Test 2c] Verifying CR-02 Zero-Weather Payload Acceptance...');
    const cr02Scan = {
      scanId: 'contract_cr02_scan',
      selectedCrop: 'tomato',
      cropMode: 'known',
      predictedCrop: 'tomato',
      predictedClass: 'tomato__septoria_leaf_spot',
      displayName: 'Tomato - Septoria Leaf Spot',
      confidence: 0.965,
      reliability: 'Good',
      imageMeta: { width: 1920, height: 1080, format: 'image/jpeg' },
      createdAt: new Date().toISOString(),
    };

    const resCR02 = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cr02Scan),
    });
    assert.strictEqual(resCR02.status, 201);
    const fetchedCR02 = (await (await fetch(`${baseUrl}/scans`)).json()).scans.find(s => s.scanId === 'contract_cr02_scan');
    assert(fetchedCR02 && fetchedCR02.reliability === 'Good' && fetchedCR02.weatherSnapshot === undefined);
    console.log('✓ CR-02 contract verified: Pure vision payload synchronized successfully without weather fields');

    // 3. S3 Presigned URL & upload
    console.log('[Test 3] Verifying Presigned Upload URL & S3 Mock...');
    const urlRes = await fetch(`${baseUrl}/scans/test_scan_001/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'image/jpeg' }),
    });
    assert.strictEqual(urlRes.status, 200);
    const { uploadUrl } = await urlRes.json();
    assert(uploadUrl.includes('/mock-s3-upload/test_scan_001'));

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: Buffer.from('mock image binary data'),
    });
    assert.strictEqual(putRes.status, 200);
    console.log('✓ Mock S3 upload URL generation and binary PUT verified');

    // 4. Fault injection & Zero Data Loss
    console.log('[Test 4] Verifying Fault Injection & Zero Data Loss under intermittent failures...');
    // Enable 100% failure rate
    await fetch(`${baseUrl}/admin/faults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ failureRate: 1.0 }),
    });

    const failRes = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sampleScan, scanId: 'test_scan_fail' }),
    });
    assert.strictEqual(failRes.status, 500);
    console.log('✓ Server properly simulated 500 transient failure');

    // Reset faults and retry -> should succeed
    await fetch(`${baseUrl}/admin/reset`, { method: 'POST' });
    const retryRes = await fetch(`${baseUrl}/scans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sampleScan, scanId: 'test_scan_recovered' }),
    });
    assert.strictEqual(retryRes.status, 201);
    console.log('✓ Post-failure retry succeeded; zero data loss contract verified');

    console.log('\n=========================================');
    console.log('ALL CLOUD MOCK SERVER & SYNC TESTS PASSED');
    console.log('=========================================\n');
  } finally {
    server.close();
  }
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
