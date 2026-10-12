# System Architecture

## 1. High-Level Architecture Overview

The system is designed around a strict **offline-first edge architecture** tailored for smallholder farmers in connectivity-deprived rural areas.

```
+-------------------------------------------------------------------------+
|                           FARMER MOBILE DEVICE                          |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                 Progressive Web Application (PWA)                 |  |
|  |  +------------------+  +-------------------+  +----------------+  |  |
|  |  | Camera & Canvas  |  | TensorFlow.js Edge|  | Weather Risk   |  |  |
|  |  | (640px Resizing) |  | (MobileNetV3-Small|  | Engine (TOMCAST|  |  |
|  |  |                  |  |  Logit Masking)   |  |  Wallin / Mills|  |  |
|  |  +--------+---------+  +---------+---------+  +--------+-------+  |  |
|  |           |                      |                     |          |  |
|  |           +----------------------+---------------------+          |  |
|  |                                  |                                |  |
|  |                                  v                                |  |
|  |               +--------------------------------------+            |  |
|  |               |       IndexedDB (cropHealthDB)       |            |  |
|  |               |  - Scans & Compressed Image Blobs    |            |  |
|  |               |  - Weather Cache & Climate Normals   |            |  |
|  |               |  - App Settings & Sync Queues        |            |  |
|  |               +------------------+-------------------+            |  |
|  +----------------------------------|--------------------------------+  |
|                                     |                                   |
|                          (Non-Blocking Sync Queue)                      |
+-------------------------------------|-----------------------------------+
                                      | (When Wi-Fi Connected)
                                      v
+-------------------------------------------------------------------------+
|                       OPTIONAL AWS CLOUD BACKEND                        |
|                                                                         |
|  +----------------------+      +-------------------------------------+  |
|  | Amazon Cognito       | ---> | HTTP API Gateway (JWT Authorizer)   |  |
|  +----------------------+      +-------------------+-----------------+  |
|                                                    |                    |
|                                 +------------------+-----------------+  |
|                                 |                                    |  |
|                                 v                                    v  |
|                   +---------------------------+       +---------------+ |
|                   | AWS Lambda (Node.js 20.x) |       | Amazon S3     | |
|                   | - health, create-scan,    |       | (Encrypted    | |
|                   |   upload-url, list-scans  |       |  Images)      | |
|                   +-------------+-------------+       +---------------+ |
|                                 |                                       |
|                                 v                                       |
|                   +---------------------------+                         |
|                   | Amazon DynamoDB           |                         |
|                   | (PlantScans Table)        |                         |
|                   +---------------------------+                         |
+-------------------------------------------------------------------------+
```

## 2. Core Non-Negotiable Invariants

1. **Zero-Network Diagnostic Invariant**:
   Under no circumstances is a network connection required, awaited, or initiated during the leaf disease diagnosis workflow. If Wi-Fi and cellular data are disabled, diagnosis executes 100% locally.
2. **Deterministic Edge Ingestion**:
   Large camera photos (12-48 megapixels) are downscaled client-side on an HTML5 Canvas to a maximum dimension of 640px before IndexedDB storage, bounding record size to ~40 KB per diagnosis.
3. **Idempotent Background Synchronization**:
   Cloud uploads are non-blocking and use client-generated UUIDs (`scanId`). Duplicate network transmissions return HTTP 200 with `isDuplicate: true`, preventing redundant records.
4. **Zero Local Data Loss**:
   Failed cloud synchronizations never purge local IndexedDB scan records.

## 3. Machine Learning Inference Pipeline

- **Runtime**: `@tensorflow/tfjs` running directly in the browser thread.
- **Backend Selection**: Probes for `webgl` hardware acceleration; falls back automatically to `cpu`.
- **Model**: MobileNetV3-Small (72,870 parameters, 310 KB quantized weights).
- **Logit Masking**: In crop-known mode, logit probabilities outside the user-selected crop are masked to zero, eliminating cross-crop misclassifications.
- **Calibrated Rejection Gate**: Predictions with confidence $< \tau$ ($\tau = 0.50$) trigger a gentle warning (*"Not sure, please retake photo"*) and suppress disease risk scoring.

## 4. Environmental Risk Engine

The system models the plant disease triangle by evaluating ambient environmental suitability:
$$RiskScore = 0.50 \cdot C_{disease} + 0.20 \cdot F_{humidity} + 0.20 \cdot F_{rain} + 0.10 \cdot F_{temp}$$

Weather inputs follow a three-tier hierarchy:
1. **Tier 1 (Live REST API)**: Open-Meteo current weather (5s timeout).
2. **Tier 2 (IndexedDB Cache)**: Last recorded live observation with honest age label.
3. **Tier 3 (Seasonal Fallback)**: Bundled 30-year agro-climatic normal averages (1991–2020) across 5 Indian agro-climatic zones.
