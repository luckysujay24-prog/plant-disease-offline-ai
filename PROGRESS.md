# Project Progress Log

This log tracks execution phase-by-phase according to Section 0.2 and Section 13 of the project specification.

| Phase | Description | Status | Verified Artifacts | Commands Used | Open Issues / Notes |
|---|---|---|---|---|---|
| **Phase 0** | Plan, task list, repo skeleton, PROGRESS.md | **COMPLETED** | Directory skeleton created, .gitignore, .env.example, initial PROGRESS.md, detailed implementation plan | PowerShell disk check, hardware inspection | Approved by user |
| **Phase 1** | Environments (Python venv, Node), pinned dependencies, README stubs | **COMPLETED** | `.venv` (Python 3.11.9), `pytest` test passed, `03_app` (Node v24.21.0, vitest 1.6.1) passed, README stubs verified | `.venv\Scripts\pytest.exe`, `npm.cmd test`, `Get-PSDrive C` | Free disk space: 317.71 GB |
| **Phase 2** | Tier 1 datasets, registry, mappings, cleaning, near-dup clustering, splits, stats | **COMPLETED** | `class_registry.yaml`, `labels.json`, `DATASET_CARD.md`, `dataset_stats.md`, zero-leakage verified (4/4 tests pass) | `apply_mapping.py`, `clean.py`, `near_duplicates.py`, `make_splits.py`, `make_cache.py`, `pytest 02_ml/tests/test_no_leakage.py` | 1,268 images verified across 38 classes & 14 crops (77.9% lab, 22.1% field) |
| **Phase 3** | Smoke test, full training M0–M3, improvement ladder | **COMPLETED** | `train_runner.js`, `train_colab.ipynb`, `improvement_log.md`, exported `model.json` + `weights.bin` | `node 02_ml/src/train_runner.js --model=M1 --smoke` | CPU smoke test completed in 310.8s (72,870 params, 310 KB model) |
| **Phase 4** | Evaluation per dataset/crop, calibration, reject threshold, OOD check, model card | **COMPLETED** | `metrics_test.json`, `confusion_matrix.json`, `model_meta.json`, `MODEL_CARD.md` | `node 02_ml/src/evaluate_runner.js` | Crop-Known vs Crop-Unknown evaluated, 95% CIs, ECE (0.0012), 64.96 ms/image latency |
| **Phase 5** | TF.js conversion, quantization check, parity test, metadata | **COMPLETED** | Exported TF.js model, `model_meta.json`, parity test (0 max diff, 0 disagreements), synced to `03_app/public/model/` | `node 02_ml/tests/test_tfjs_parity.js`, `python 02_ml/src/sync_model_to_app.py` | Parity verified over 100 images; sync automated |
| **Phase 6** | PWA shell, screens, Service Worker, manifest | **COMPLETED** | `App.jsx`, `Home.jsx`, `ChooseCrop.jsx`, `DetectDisease.jsx`, `Result.jsx`, `CropWeather.jsx`, `History.jsx`, `Settings.jsx`, PWA precache (11 entries) | `npm.cmd run build` | Workbox service worker precaches application shell and 310 KB model shards |
| **Phase 7** | IndexedDB, session, profile, history | **COMPLETED** | `03_app/src/offline/db.js` (`cropHealthDB`), crash recovery from `SYNCING` to `PENDING_SYNC`, 640px client canvas downscaling | `npm.cmd test` | All IndexedDB tests passing |
| **Phase 8** | In-browser crop-aware inference integrated | **COMPLETED** | `03_app/src/ml/modelRunner.js`, crop-aware logit masking, tau gate reject option ($\tau = 0.50$) | `npm.cmd test` | 0 network calls during inference |
| **Phase 9** | Weather module, disease knowledge base, risk engine | **COMPLETED** | `riskEngine.js`, `weatherService.js`, `disease_knowledge.json` (38 classes cited), `seasonal_profile.json` (5 regions) | `npm.cmd test` | 12/12 Vitest tests passing |
| **Phase 10** | Mock server and sync manager | **COMPLETED** | `04_cloud/mock-server/server.js`, `test_sync.js`, fault injection endpoints (`/admin/faults`) | `node 04_cloud/mock-server/test_sync.js` | Idempotency on `scanId`, 0 duplicates, 0 data loss |
| **Phase 11** | AWS layer (SAM template, Lambdas, DynamoDB, S3, Cognito) | **COMPLETED** | `template.yaml`, `health.js`, `create-scan.js`, `get-upload-url.js`, `list-scans.js`, `generate_schema.js`, `AWS_CONSOLE_GUIDE.md` | `node 04_cloud/scripts/generate_schema.js` | Zero-cost serverless SAM backend configured within Free Tier |
| **Phase 12** | Full end-to-end tests (Scenarios A/B/C, failure cases) | **COMPLETED** | `e2e_offline_flow.test.js`, `PHONE_TEST_SHEET.md` (marked `PENDING HUMAN TEST`) | `npm.cmd test` | Offline invariant strictly verified (0 network calls in diagnosis) |
| **Phase 13** | Experiments E1–E7 | **COMPLETED** | Results JSON files (`e1`–`e7`), `SUMMARY.json`, 4 empirical figures in `05_experiments/figures/` | `node 05_experiments/scripts/run_all_experiments.js`, `python 05_experiments/scripts/plot_figures.py` | Real measurements on CPU latency, model size, conditioning gap, domain shift |
| **Phase 14** | Research paper from real results, check_numbers.py | **COMPLETED** | `RESEARCH_PAPER.md`, `RESEARCH_PAPER.docx` (plain unshaded tables), `check_numbers.py` audit | `python 06_paper/build_paper.py`, `python 06_paper/check_numbers.py` | 20/20 numeric claims verified against `SUMMARY.json`. Exact authors: D. Sujay, V. L. Dharma Teja, K. Dhileep |
| **Phase 15** | Final documentation, cleanup, handoff verification | **COMPLETED** | `07_docs/ARCHITECTURE.md`, `API.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, `EXPERIMENTS.md`, `TAXONOMY.md`, `README.md` | Sequential test pass | Fresh-clone reproducibility verified |
| **CR-0** | Baseline Regression Audit & Snapshot | **COMPLETED** | `05_experiments/results/regression_baseline.json`, `CR01_IMPLEMENTATION_PLAN.md` | `pytest`, `vitest`, `test_tfjs_parity.js`, `check_numbers.py` | All 5 baseline suites green; metrics hashed; Gate G1 approved |
| **CR-1** | Feature Flags & Additive IndexedDB Schema | **COMPLETED** | `features.json`, `03_app/src/offline/db.js` (`DB_VERSION = 2`, `forecastCache`), `features_off_regression.test.js` | `npm.cmd test` | All flags default false; regression isolation verified |
| **CR-2** | Any-Photo Pipeline (EXIF, Stepwise Halving, ExG) | **COMPLETED** | `image-quality.json`, `qualityChecks.js`, `downsample.js`, `decode.js`, `crop.js`, `image_pipeline.test.js` | `npm.cmd test` | 48 MP safe halving (<50 MB RAM), Laplacian blur, ExG non-leaf gate |
| **CR-3** | Model Robustness Evaluation & Promotion | **COMPLETED** | `augmentations.py`, `run_e8_robustness.py`, `e8_image_robustness.json`, `promotion_report.md` | `python run_e8_robustness.py` | M1-Robust passes Section 3.8 promotion rule (+3.5% avg, +8.0% Q=10) |
| **CR-4** | Forecast-Aware Weather Layer | **COMPLETED** | `weatherProvider.js` (Open-Meteo), `forecast.js` (freshness levels, 3-day disease outlook), `forecast.test.js` | `npm.cmd test` | Asynchronous non-blocking multi-day caching |
| **CR-5** | Nutrition & Care Advisor Rule Engine | **COMPLETED** | `advisor-config.json`, `application_rules.json` (R1-R8), `fertilizer_knowledge.json`, `ruleEngine.js`, `advisor_rules.test.js`, `ADVISOR.md`, `EXPERT_REVIEW.md` | `npm.cmd test` | Deterministic timing, zero brand names, zero invented doses |
| **CR-6** | UI Integration & Additive Screens | **COMPLETED** | `DetectDisease.jsx`, `Result.jsx` ("What to do & when"), `CropWeather.jsx`, `History.jsx`, `Settings.jsx`, `en.json` | `npm.cmd run build`, `npm.cmd test` | 31/31 Vitest tests pass; Vite PWA builds cleanly in 18s |
| **CR-7** | Additive Cloud Schema & Contract Testing | **COMPLETED** | `scan-schema.json`, `create-scan.js`, `test_sync.js` (contract test 2b) | `node 04_cloud/mock-server/test_sync.js` | Old v1.0.0 and new v1.1.0 payloads both succeed (201 Created) |
| **CR-8** | Empirical Experiments E8, E9, E10 & Figures | **COMPLETED** | `run_e9_e10.js`, `e9_advisor_verification.json` (100% pass), `e10_nonblocking_proof.json` (0.4ms variance), `plot_figures.py` (Fig 5 & 6) | `node run_e9_e10.js`, `python plot_figures.py` | Offline invariant proven (0 diagnosis network calls across 5 states) |
| **CR-9** | Research Paper, Numeric Audit & Rollback Docs | **COMPLETED** | `RESEARCH_PAPER.md`, `RESEARCH_PAPER.docx`, `check_numbers.py` (30/30 claims verified), `CR01_ROLLBACK.md`, `IMAGE_PIPELINE.md` | `python build_paper.py`, `python check_numbers.py` | 100% audit pass; strict truthfulness contract verified |
| **CR-02** | Low Match Fix, Full PlantVillage (55k) Dataset, Care Advice & Weather Removal | **COMPLETED** | `07_docs/DIAGNOSIS_LOW_MATCH.md`, `07_docs/CR02_REMOVAL.md`, `care_knowledge.json`, `CropCare.jsx`, `Result.jsx`, `03_app/public/model/` (TF.js weights 284.6 KB), `metrics_test.json` (Top-1: 90.51%, Top-3: 97.38%), `check_numbers.py` (23/23 audit passed) | `python train_pytorch.py`, `python evaluate_pytorch.py`, `python sync_model_to_app.py`, `node test_tfjs_parity.js`, `npm test` | Fully resolved: Hard blocking error removed, reliability badges (Good/Fair/Low), 90.51% test accuracy across 8,251 test images, zero weather dependencies. |

---

## Detailed Acceptance Summary

- **Total Canonical Classes**: 38 classes across 14 crops.
- **Dataset**: Comprehensive PlantVillage (55,110 cleaned unique images across 14 crops and 38 classes).
- **Split Breakdown**: 38,661 train (70%), 8,198 validation (15%), 8,251 test (15%) with 0% data leakage verified via perceptual hash clustering.
- **Deployed Architecture**: MobileNetV3-Small (72,134 parameters, 284.6 KB TF.js weights, 7.08 ms CPU inference latency).
- **Empirical Test Accuracy (8,251 test samples)**:
  - Top-1 Accuracy: **90.51%**
  - Top-3 Accuracy: **97.38%**
  - Macro-F1: **86.56%**
  - Weighted-F1: **90.30%**
  - Expected Calibration Error (ECE): **0.0998**
- **Parity Guarantee**: Bit-level TF.js parity verified with 0.0000e+0 maximum difference and 0 class disagreements.
- **Result Flow**: Hard "Not accurate, retake photo" rejection completely removed; always presents disease name, confidence %, top-3 candidate strip, and evidence-based care advice (`care_knowledge.json`).
- **Weather Removal**: All weather and risk engine modules cleanly removed from frontend and cloud sync.
- **Offline Guarantee**: Exactly 0 network calls during offline diagnosis path.
- **Cloud Layer**: AWS Serverless (SAM) + zero-cost local Node.js mock server with proven idempotency and zero data loss.
- **Academic Research Paper**: Built in `.md` and `.docx` formats with plain unshaded tables, exact author metadata (D. Sujay, V. L. Dharma Teja, K. Dhileep), literature citations, and 23/23 verified numeric claim consistency.

