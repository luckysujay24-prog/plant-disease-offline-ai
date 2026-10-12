# CR-01 Rollback & Feature Flag Guide

This document details the exact procedures for disabling Change Request 01 (CR-01) features or reverting the system back to baseline v1.0.0.

---

## 1. Zero-Risk Feature Flag Deactivation

All CR-01 capabilities are gated behind independent boolean flags in `03_app/src/config/features.json`. 
To deactivate any or all CR-01 features instantly without code refactoring or schema migration, edit `03_app/src/config/features.json`:

```json
{
  "robustImageInput": false,
  "multiView": false,
  "forecastAdvisor": false,
  "fertilizerAdvisor": false,
  "manualWeather": false
}
```

### Effect of Setting Flags to `false`:
- **`robustImageInput: false`**: Reverts image handling to baseline canvas downsampling without blur variance, luminance checks, or ExG non-leaf detection.
- **`multiView: false`**: Preserves single-center-crop inference (default OFF to preserve sub-70ms mobile execution).
- **`forecastAdvisor: false`**: Completely hides the 7-day weather forecast strip and 3-day disease-weather outlook. Reverts to the single-day weather snapshot.
- **`fertilizerAdvisor: false`**: Hides the "What to Do & When (Care & Nutrition)" card from the Result screen. Restores the exact Result view of baseline v1.0.0.
- **`manualWeather: false`**: Hides manual weather input/override controls in Crop & Weather view.

**Baseline Invariant**: Setting all 5 flags to `false` is verified by automated test suite `03_app/tests/features_off_regression.test.js` to produce byte-for-byte identical scan payloads and UI behavior to v1.0.0.

---

## 2. Additive IndexedDB Schema Compatibility

In CR-01, the client database was upgraded from `DB_VERSION = 1` to `DB_VERSION = 2` in `03_app/src/offline/db.js`.
- The migration is **strictly additive**:
  - Store added: `forecastCache` (stores weather forecast objects keyed by coordinate string).
  - Existing stores (`scans`, `images`, `weatherCache`, `settings`, `syncLog`) are untouched.
  - New scan attributes (`imageMeta`, `cropStage`, `manualWeather`, `forecastSnapshot`, `outlook`, `advisory`) are optional fields.
- **Backward Compatibility**: If an app running v1.0.0 code opens a database created by v1.1.0, or vice versa, existing scan records continue to load and display seamlessly.

### Reverting IndexedDB Version (If Hard Rollback is Required)
If you wish to force IndexedDB back to v1:
1. In `03_app/src/offline/db.js`, change `const DB_VERSION = 2;` to `const DB_VERSION = 1;`.
2. Remove `if (!db.objectStoreNames.contains('forecastCache')) { db.createObjectStore('forecastCache'); }`.
3. Open browser Developer Tools → Application → Storage → IndexedDB → Delete database `plant-disease-offline-db` (or click "Clear All Device Storage" in Settings).

---

## 3. Cloud Contract Additive Compatibility

The cloud DynamoDB schema in `04_cloud/infra/scan-schema.json` and Lambda handler `04_cloud/lambdas/create-scan.js` were modified in a strictly additive manner:
- Required fields remain: `scanId`, `selectedCrop`, `cropMode`, `predictedCrop`, `predictedClass`, `displayName`, `confidence`, `weatherSnapshot`, `risk`, `createdAt`.
- New fields (`imageMeta`, `cropStage`, `manualWeather`, `forecastSnapshot`, `outlook`, `advisory`) are optional.
- Backward and forward contract compatibility is verified by `04_cloud/mock-server/test_sync.js` (Test 2b).

---

## 4. Model Versioning & Rollback

- **Baseline Model (v1.0.0)**: MobileNetV3-Small (`02_ml/models/m1_mobilenetv3_small.json`, 72,870 params, 310 KB).
- **Robust Model (v1.1.0)**: MobileNetV3-Small-Robust (`02_ml/models/m1_robust.json`).
- If you wish to roll back the deployed browser model to v1.0.0:
  1. Copy `02_ml/models/m1_mobilenetv3_small.json` and `m1_mobilenetv3_small_weights.bin` into `03_app/public/model/model.json` and `weights.bin`.
  2. Set `modelVersion: "1.0.0"` in `03_app/src/classifier/engine.js`.
  3. Rebuild via `npm run build` in `03_app/`.
