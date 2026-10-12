# Automated Test Suite & Verification Guide

This repository contains a comprehensive suite of automated tests across ML, Frontend, Cloud Sync, and Paper Truthfulness.

## 1. Test Matrix Overview

| Test Suite | Purpose | Command |
| :--- | :--- | :--- |
| **Data Leakage Check** | Validates zero train/val/test overlap and zero pHash collision | `pytest 02_ml/tests/test_no_leakage.py` |
| **TF.js Parity Check** | Verifies zero prediction divergence between Python/Keras and TF.js | `node 02_ml/tests/test_tfjs_parity.js` |
| **PWA Unit & E2E Tests** | Verifies Vitest risk engine, IndexedDB states, and zero-network offline invariant | `npm test` (inside `03_app/`) |
| **Cloud Sync & Idempotency** | Verifies mock server, fault injection, and zero data loss | `node 04_cloud/mock-server/test_sync.js` |
| **Benchmark Experiments** | Executes protocols E1 to E7 and updates `SUMMARY.json` | `node 05_experiments/scripts/run_all_experiments.js` |
| **Numeric Claims Audit** | Enforces Truthfulness Contract: paper numbers must match real results | `python 06_paper/check_numbers.py` |

---

## 2. Running All Tests Sequentially

From the repository root:

### Windows PowerShell
```powershell
# 1. ML Data Leakage Test
.venv\Scripts\python.exe -m pytest 02_ml/tests/test_no_leakage.py

# 2. TF.js Parity Test
node 02_ml/tests/test_tfjs_parity.js

# 3. Frontend App & Offline Invariant Tests
cd 03_app
npm.cmd test
cd ..

# 4. Cloud Mock Server & Idempotency Tests
node 04_cloud/mock-server/test_sync.js

# 5. Strict Paper Numeric Claims Audit
.venv\Scripts\python.exe 06_paper/check_numbers.py
```

### macOS / Linux
```bash
# 1. ML Data Leakage Test
.venv/bin/pytest 02_ml/tests/test_no_leakage.py

# 2. TF.js Parity Test
node 02_ml/tests/test_tfjs_parity.js

# 3. Frontend App & Offline Invariant Tests
cd 03_app && npm test && cd ..

# 4. Cloud Mock Server & Idempotency Tests
node 04_cloud/mock-server/test_sync.js

# 5. Strict Paper Numeric Claims Audit
.venv/bin/python 06_paper/check_numbers.py
```
