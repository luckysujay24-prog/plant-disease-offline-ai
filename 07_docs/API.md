# Cloud REST API & Mock Server Specification

The cloud layer is exposed via Amazon API Gateway (HTTP API) or the local Node.js mock server (`04_cloud/mock-server/server.js`).

## 1. Authentication
- **Production (AWS)**: Authorization header containing Cognito JWT Bearer token: `Authorization: Bearer <token>`.
- **Mock Server**: Optional mock user identifier header: `x-mock-user-id: <userId>`.

---

## 2. Endpoints

### 2.1 Health Check
- **Path**: `GET /health`
- **Auth**: None (Public)
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "plant-disease-offline-ai-cloud",
  "timestamp": "2026-10-09T15:00:00.000Z"
}
```

---

### 2.2 Synchronize Scan Record
- **Path**: `POST /scans`
- **Auth**: JWT Bearer
- **Idempotency**: Keyed on `scanId`. Submitting an existing `scanId` returns `200 OK` with `isDuplicate: true`.
- **Request Body**:
```json
{
  "scanId": "scan_uuid_12345",
  "selectedCrop": "tomato",
  "cropMode": "known",
  "predictedCrop": "tomato",
  "predictedClass": "tomato__early_blight",
  "displayName": "Tomato - Early Blight",
  "confidence": 0.892,
  "belowThreshold": false,
  "weatherSnapshot": {
    "temperatureC": 26.5,
    "humidityPct": 82.0,
    "rainMm": 4.5,
    "source": "live",
    "sourceLabel": "Live Weather (Open-Meteo, 14:30)"
  },
  "risk": {
    "score": 0.74,
    "category": "HIGH"
  },
  "createdAt": "2026-10-09T14:30:00.000Z"
}
```
- **Response (New Record)**: `201 Created`
```json
{
  "message": "Scan synchronized successfully",
  "scan": { ... },
  "isDuplicate": false
}
```
- **Response (Duplicate Submission)**: `200 OK`
```json
{
  "message": "Scan already recorded (idempotent duplicate)",
  "scan": { ... },
  "isDuplicate": true
}
```

---

### 2.3 Request S3 Presigned Upload URL
- **Path**: `POST /scans/{scanId}/upload-url`
- **Auth**: JWT Bearer
- **Request Body**:
```json
{
  "contentType": "image/jpeg"
}
```
- **Response**: `200 OK`
```json
{
  "uploadUrl": "https://crop-health-images-....s3.amazonaws.com/users/.../scans/scan_uuid_12345.jpg?...",
  "key": "users/user_123/scans/scan_uuid_12345.jpg",
  "expiresInSeconds": 300
}
```

---

### 2.4 List Farmer Scans
- **Path**: `GET /scans`
- **Auth**: JWT Bearer
- **Response**: `200 OK`
```json
{
  "scans": [ ... ],
  "count": 12
}
```

---

## 3. Mock Server Fault Injection Endpoints

Used for automated resilience testing:
- `POST /admin/faults`: Sets `{ failureRate: 0.3, injectedLatencyMs: 200, disconnectMidRequest: false }`.
- `POST /admin/reset`: Clears simulated errors and in-memory scans store.
