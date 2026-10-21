# plant-disease-offline-ai
# 🌿 Offline-First Edge AI for Crop Disease Detection

**An offline-first edge AI framework for crop disease detection with evidence-based agronomic care guidance.**

A Progressive Web App that diagnoses plant leaf diseases **entirely on the phone**, with **zero network calls**. The neural network runs inside the mobile browser through TensorFlow.js, so a farmer with no signal still gets a diagnosis and safe, sourced care advice. Cloud backup through AWS is optional and never blocks anything.

![Status](https://img.shields.io/badge/status-research%20prototype-orange)
![Crops](https://img.shields.io/badge/crops-14-green)
![Classes](https://img.shields.io/badge/disease%20classes-38-green)
![Model](https://img.shields.io/badge/model-285%20KB-blue)
![Offline](https://img.shields.io/badge/offline-0%20network%20calls-success)
![PWA](https://img.shields.io/badge/PWA-installable-blueviolet)

---

## 📋 Table of Contents

- [Why this project](#-why-this-project)
- [Key results](#-key-results)
- [Screenshots](#-screenshots)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech stack](#-tech-stack)
- [Repository structure](#-repository-structure)
- [Getting started](#-getting-started)
- [Dataset and splits](#-dataset-and-splits)
- [Training the model](#-training-the-model)
- [Experiments](#-experiments)
- [AWS cloud layer (optional)](#-aws-cloud-layer-optional)
- [Testing](#-testing)
- [Limitations](#-limitations)
- [Roadmap](#-roadmap)
- [Paper and citation](#-paper-and-citation)
- [Authors](#-authors)
- [License](#-license)

---

## 🌾 Why this project

Small farms feed hundreds of millions of families, but leaf diseases can destroy a crop in days. Expert help is rarely close by. Existing mobile diagnosis tools have four practical problems:

| Problem | What existing tools do | What this project does |
|---|---|---|
| **No signal in villages** | Upload the photo to a cloud server; freeze when the network fails | Run the model on the phone — **0 network calls** |
| **Rejected photos** | Show "photo not accurate, please retake" and discard the image | Always show the best answer with an honest **reliability badge** |
| **Unsafe advice** | Name branded pesticides and invent dosages | Generic nutrients only, **no dosages**, every entry sourced |
| **Inflated accuracy** | Random splits leak near-duplicate leaves into the test set | **pHash cluster-level splitting** so no leaf crosses a split |

---

## 📊 Key results

Measured on the held-out test partition of **8,251 images**.

| Metric | Value |
|---|---|
| Top-1 accuracy | **90.51%** |
| Top-3 accuracy | **97.38%** |
| Macro-F1 | 86.56% |
| Weighted-F1 | 90.30% |
| Expected Calibration Error (ECE) | 0.0998 |
| Best validation accuracy | 90.79% |
| Parameters | **72,134** |
| Serialized model size | **285 KB** |
| CPU inference latency | **7.08 ms** |
| Network calls during offline diagnosis | **0** |
| Total on-device footprint (app + model + 100 scans) | **6.52 MB** |

### Backbone comparison

| ID | Architecture | Params | Size | Latency | Top-1 | Top-3 | Edge deployable |
|---|---|---|---|---|---|---|---|
| M0 | Custom Plain CNN | 184,520 | 721 KB | 48.20 ms | 34.80% | 58.20% | Yes (low accuracy) |
| M1 | MobileNetV2 | 2,235,000 | 8,900 KB | 95.60 ms | 91.80% | 98.00% | Partial (high memory) |
| M2 | MobileNetV3-Large | 2,185,440 | 8,530 KB | 112.50 ms | 92.10% | 98.10% | Partial (heavy) |
| M3 | EfficientNet-B0 | 4,056,220 | 15,840 KB | 218.40 ms | 93.40% | 98.60% | No (exceeds PWA limits) |
| M4 | SqueezeNet | 1,248,424 | 4,850 KB | 65.30 ms | 88.70% | 96.20% | Yes (moderate) |
| M5 | ShuffleNetV2 | 1,366,009 | 5,200 KB | 52.80 ms | 89.90% | 96.80% | Yes (edge optimized) |
| M6 | EfficientNet-Lite0 | 4,650,000 | 18,200 KB | 145.70 ms | 92.80% | 98.30% | No (too large) |
| **M7** | **MobileNetV3-Small** ✅ | **72,134** | **285 KB** | **7.08 ms** | **90.51%** | **97.38%** | **Yes (production)** |

**M7 was selected.** It gives up about 3 percentage points of Top-1 accuracy against EfficientNet-B0 but is **55× smaller** and **31× faster**, which is what makes in-browser offline inference possible.

> **Note on the 90.51% figure.** This is lower than the 99%+ reported by earlier work on PlantVillage, because those studies used random splits that leak near-duplicate photographs of the same leaf into the test set. This project splits by perceptual-hash cluster, which is a harder and more honest test.

### Cloud sync resilience (100 scans)

| Fault rate | Success rate | Data loss | Duplicates | Avg retries |
|---|---|---|---|---|
| 0% | 100.0% | 0 | 0 | 1.00 |
| 10% | 100.0% | 0 | 0 | 1.12 |
| 30% | 100.0% | 0 | 0 | 1.45 |
| 50% | 100.0% | 0 | 0 | 2.08 |

---

**Diagnosis across crops and reliability tiers:**

| Orange — Huanglongbing | Bell Pepper — Bacterial Spot | Peach — Bacterial Spot | Cherry — Powdery Mildew |
|---|---|---|---|
| 100% · GOOD | 100% · GOOD | 100% · GOOD | 61% · FAIR |

> Put your screenshot files in `docs/screenshots/` and keep these filenames, or update the paths above.

---

## ✨ Features

### Offline-first diagnosis
- The complete path — photo → model → result → care advice → save — makes **zero network requests**.
- Model shards and the app shell are precached by a Workbox Service Worker.
- All records are stored locally in IndexedDB (`cropHealthDB`).
- Installable as a PWA. No app store, no native build.

### Honest reliability, not rejection screens
Instead of blocking a doubtful photo, the app always returns its best answer with a calibrated badge:

| Badge | Confidence | Behaviour |
|---|---|---|
| 🟢 **Good** | ≥ 70% | Full result and care guidance |
| 🟡 **Fair** | 40–69% | Full result, top-3 candidates emphasised |
| 🔴 **Low** | < 40% | Full result plus *"Low confidence. A close, well-lit photo of one leaf may help"* |

The top-3 candidate distribution is always shown, so the farmer can see the alternatives.

### Safe agronomic care guidance
A deterministic knowledge base (`care_knowledge.json`) covering all 38 conditions, built on four rules:

1. **Non-curative principle** — fertilizers do not cure active infections, and the app says so.
2. **Generic nutrients only** — no commercial brand names.
3. **Zero fabricated dosages** — farmers are directed to their soil test report or local Krishi Vigyan Kendra.
4. **Grounded in extension publications** — Cornell Cooperative Extension, UC IPM, UF/IFAS, Penn State Extension.

### Robust image input
- Accepts any phone photo: any resolution, any format the browser can decode, any orientation.
- Handles up to **48 MP (8000×6000)** via stepwise halving canvas downsampling in **142.0 ms**, with no memory crashes.
- A client-side **Excess Green (ExG)** index filter rejects non-leaf photos with **96.0%** accuracy, preventing invented diagnoses.

### Optional, non-blocking cloud backup
AWS serverless sync that runs in the background and never delays a diagnosis. **0.0% data loss and 0.0% duplicates** even at a 50% simulated connection-drop rate.

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  ON THE PHONE — works with Wi-Fi and mobile data OFF         │
│                                                              │
│  Photo input  →  Decode & shrink  →  MobileNetV3-Small       │
│  (camera or     (EXIF fix,           (TensorFlow.js,         │
│   gallery)       canvas downscale)    Service Worker cache)  │
│                          ↓                                   │
│              Calibrated reliability badge + top-3            │
│                          ↓                                   │
│              Care & nutrition guidance (bundled JSON)        │
│                          ↓                                   │
│        IndexedDB: scans · sync queue · session               │
└──────────────────────────────────────────────────────────────┘
                           ↕ (only when online — never required)
┌──────────────────────────────────────────────────────────────┐
│  OPTIONAL AWS LAYER                                          │
│  Cognito → API Gateway (HTTP) → Lambda ARM64 → DynamoDB      │
│                                              → S3 (AES-256)  │
└──────────────────────────────────────────────────────────────┘
```

**The invariant:** nothing in the lower box can delay, block or change a diagnosis. A failed sync never deletes or edits a local record.

### Sync state machine

```
LOCAL ──→ PENDING_SYNC ──→ SYNCING ──→ SYNCED
                ↑              │
                └──── FAILED ←─┘
             (retry with backoff)
```

Each scan carries a client-generated UUID (`scanId`), and DynamoDB uses a conditional put, so duplicate delivery cannot create duplicate records.

---

## 🛠 Tech stack

**Machine learning**
- Python 3.11.9 · PyTorch 2.6.0+cpu · Torchvision 0.21.0
- TensorFlow.js 4.17.0 (in-browser inference)
- ImageHash 4.3.1 · Pillow 10.3.0 · Scikit-Learn 1.4.2 · NumPy 1.26.4

**Frontend**
- Node.js 20.18.0 · React 18.2.0 · Vite 5.2.10
- vite-plugin-pwa 0.19.8 (Workbox Service Worker) · idb 8.0.0

**Cloud (optional)**
- AWS SAM · Amazon Cognito · API Gateway HTTP API
- AWS Lambda (Node.js 20, ARM64) · DynamoDB On-Demand · S3 with lifecycle rules

**Testing**
- Vitest 1.5.0 · Playwright 1.43.1 · Pytest 8.1.1

**Platforms**
- Windows 10/11 · Ubuntu 22.04/24.04 LTS · macOS Sonoma/Sequoia
- Target browsers: Chrome on Android, Safari on iOS

---

## 📁 Repository structure

```
.
├── 01_data/                 # Dataset registry, cleaning, splits
│   ├── raw/                 #   PlantVillage images (not committed)
│   └── splits/              #   train.csv, validation.csv, test.csv
├── 02_ml/                   # Training and evaluation
│   ├── src/                 #   near_duplicates.py, make_splits.py, train.py
│   ├── configs/             #   Training configs
│   ├── reports/             #   Training logs, improvement log
│   └── tests/               #   test_no_leakage.py
├── 03_app/                  # React + Vite PWA client
│   ├── src/
│   │   ├── config/          #     class_registry.yaml, care_knowledge.json
│   │   ├── i18n/            #     Locale files
│   │   └── model/           #     model.json + weights.bin (TF.js shards)
│   └── public/
├── 04_cloud/                # AWS SAM template and Lambda handlers
│   └── template.yaml
├── 05_experiments/          # E1–E8 protocols, scripts, results, figures
│   ├── protocols/
│   ├── scripts/
│   └── results/             #   SUMMARY.json and per-experiment JSON
├── 06_paper/                # Manuscript and literature review
├── 07_docs/                 # SECURITY.md, PHONE_TEST_SHEET.md, TAXONOMY.md
└── README.md
```

> Adjust this tree to match your actual repository before publishing.

---

## 🚀 Getting started

### Prerequisites

- **Node.js** ≥ 20.18.0 and npm
- **Python** ≥ 3.11 (only needed for training and data preparation)
- A modern browser (Chrome 100+, Safari 16+)

### Run the app

```bash
# Clone
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>/03_app

# Install
npm install

# Start the dev server
npm run dev
```

Open **http://localhost:5173**.

To test offline behaviour: build and preview, then switch the network to offline in DevTools.

```bash
npm run build
npm run preview
```

> The Service Worker only registers in a production build, so **offline mode will not work in `npm run dev`.**

### Install on a phone

1. Run `npm run build && npm run preview -- --host`.
2. Open the shown LAN address on a phone connected to the same Wi-Fi.
3. Use the browser menu → **Add to Home Screen**.
4. Open the app once so the model caches, then turn off Wi-Fi and mobile data and test.

---

## 📦 Dataset and splits

The model is trained on the public **PlantVillage** dataset: **14 crops** and **38 condition classes**.

| Split | Images | Share |
|---|---|---|
| Train | 38,661 | 70% |
| Validation | 8,198 | 15% |
| **Test (held out)** | **8,251** | **15%** |
| **Total** | **55,110** | 100% |

### Leakage-free splitting

PlantVillage contains several photographs of the same physical leaf from slightly different angles. A random split puts near-duplicates in both train and test, which inflates the reported accuracy. The pipeline prevents this:

1. Compute a 64-bit DCT perceptual hash for every image:
   `H(I) = pHash(I) ∈ {0,1}⁶⁴`
2. Cluster any pair within a Hamming distance of 6:
   `Dist_H(H_i, H_j) = Σ (H_i[k] ⊕ H_j[k]) ≤ 6`
3. Assign every image in a cluster to the **same** split.

A test asserts zero hash and cluster overlap across splits before training can start.

```bash
cd 02_ml
python src/near_duplicates.py      # pHash clustering
python src/make_splits.py          # cluster-level stratified split
pytest tests/test_no_leakage.py    # must pass before training
```

**The dataset is not committed to this repository.** Download it separately and check its own licence terms before use.

---

## 🧠 Training the model

```bash
cd 02_ml
pip install -r requirements.txt
python src/train.py --config configs/mobilenetv3_small.yaml
python src/export_tfjs.py          # exports model.json + weights.bin
```

**Training setup**
- Architecture: MobileNetV3-Small with depthwise-separable convolutions, Squeeze-and-Excitation attention, hard-swish activations
- Input: 224 × 224 RGB
- Optimizer: AdamW, weight decay 1e-4, initial LR 1e-3, cosine annealing
- Inverse-frequency class weighting for class imbalance
- Export: TensorFlow.js format (`model.json` + `weights.bin`, 285 KB total)

**Why depthwise-separable convolutions.** Replacing a standard convolution reduces the computation by:

```
Cost_Ratio = 1/N + 1/D_K²
```

where `N` is the output channel count and `D_K` the kernel size. With a 3×3 kernel this is roughly **8–9× fewer** multiply-adds, which is what lets the model run in a mobile browser.

---

## 🔬 Experiments

| ID | Experiment | What it measures |
|---|---|---|
| E1 | Model architecture & edge efficiency | Params, size, latency, Top-1/Top-3 across 8 backbones |
| E2 | Held-out test classification | Accuracy, macro/weighted F1, ECE, per-crop breakdown |
| E3 | Zero-network offline guarantee | Network call count during offline diagnosis (must be 0) |
| E4 | Cloud sync fault resilience | Success rate, data loss, duplicates at 0–50% fault rates |
| E5 | Storage footprint & cold start | On-device bytes, cold-start latency from cache |
| E6 | Image input robustness | Accuracy vs JPEG quality and resolution; non-leaf gate |
| E7 | Care advisor rule verification | Rule pass rate, brand violations, dosage violations |
| E8 | Non-blocking independence | Latency delta across 5 network states |

```bash
cd 05_experiments
python scripts/run_all.py          # writes results/SUMMARY.json
python scripts/check_numbers.py    # every reported number must trace to a results file
```

**No number in the paper or this README is hand-written.** `check_numbers.py` verifies that each one traces back to a stored result file.

---

## ☁️ AWS cloud layer (optional)

The app is fully functional without any of this. Deploy only if you want backup and sync.

| Service | Role |
|---|---|
| **Cognito** | User authentication via User Pools and JWT |
| **API Gateway (HTTP)** | Endpoints `/scans`, `/scans/upload-url`, `/health` |
| **Lambda (ARM64)** | Node.js 20 handlers for scan metadata and presigned URLs |
| **DynamoDB** | `PlantScans` table, on-demand, key `(userId, scanId)` |
| **S3** | AES-256 encrypted leaf photos, 90-day lifecycle rule |

```bash
cd 04_cloud
sam build
sam deploy --guided
```

Copy the output API endpoint into `03_app/.env` as `VITE_API_BASE_URL`.

> **Never commit AWS credentials.** Use `aws configure` or environment variables, and keep `.env` in `.gitignore`.

---

## ✅ Testing

```bash
# Frontend unit tests
cd 03_app && npm run test

# End-to-end, including offline emulation
npm run test:e2e

# ML pipeline tests
cd 02_ml && pytest
```

**Coverage includes:** the zero-network assertion while offline, IndexedDB persistence and migrations, reliability-tier boundary values (0.40 / 0.70), care-engine brand and dosage violations (must be zero), sync idempotency under injected faults, and the no-leakage split test.

---

## ⚠️ Limitations

Stated plainly, because they matter for anyone building on this:

1. **No physical smartphone validation yet.** Automated harnesses cannot operate a handheld camera. Marked `PENDING HUMAN TEST` in `07_docs/PHONE_TEST_SHEET.md`.
2. **Trained on laboratory imagery.** PlantVillage photographs leaves against plain backgrounds. Accuracy on cluttered outdoor field photos with multiple co-infections will be lower, and has not been measured here.
3. **Closed class set.** The model knows 14 crops and 38 conditions. Anything outside that — other crops, other diseases, fruit, stems, roots — gets its nearest match with low reliability, not a correct answer.
4. **Care guidance is not a prescription.** It is drawn from extension publications, carries no dosages, and has not been reviewed by a practising agronomist. Farmers are always directed to their local agriculture officer.
5. **Diagnosis is a suggestion, not a certainty.** Even a Good reliability badge is a probability, not a confirmed identification.

---

## 🗺 Roadmap

- [ ] Physical phone testing across devices and lighting conditions
- [ ] Multi-language support: Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali and more, with native-speaker review of all safety-critical strings
- [ ] Farmer login with name, phone number and a 4-digit PIN, working fully offline
- [ ] Field-image training data to close the laboratory-to-field gap
- [ ] Agronomist review of the full care knowledge base
- [ ] Voice guidance for low-literacy users

---

## 📄 Paper and citation

This repository accompanies the manuscript *"An Offline-First Edge AI Framework for Crop Disease Detection with Evidence-Based Agronomic Care Guidance."*

```bibtex
@misc{sujay2026offlinecrop,
  title  = {An Offline-First Edge AI Framework for Crop Disease Detection
            with Evidence-Based Agronomic Care Guidance},
  author = {Sujay, D. and Dharma Teja, V. L. and Dhileep, K.},
  year   = {2026},
  note   = {Vellore Institute of Technology, Chennai}
}
```

### Key references

1. Hughes, D. & Salathé, M. *An open access repository of images on plant health.* arXiv:1511.08060 (2015).
2. Mohanty, S. P., Hughes, D. P. & Salathé, M. *Using deep learning for image-based plant disease detection.* Frontiers in Plant Science 7, 1419 (2016).
3. Howard, A. et al. *Searching for MobileNetV3.* ICCV, 1314–1324 (2019).
4. Singh, D. et al. *PlantDoc: a dataset for visual plant disease detection in the wild.* CoDS-COMAD, 249–253 (2020).

---

## 👥 Authors

| Name | Reg. No. | Contribution |
|---|---|---|
| **D. Sujay** | 24BRS1027 | Research conception, edge neural pipeline, MobileNetV3-Small training and TF.js serialization, manuscript |
| **V. L. Dharma Teja** | 24BRS1196 | Dataset curation, pHash deduplication pipeline, cluster-level stratified splitting |
| **K. Dhileep** | 24BRS1389 | Reliability engine, PWA client with IndexedDB, AWS sync layer, experimental results |

School of Computer Science and Engineering (SCOPE), Vellore Institute of Technology, Chennai.

---

## 📜 License

**Choose a license before publishing.** For an academic project, MIT or Apache 2.0 are common choices. Add the full text as a `LICENSE` file in the repository root.

The **PlantVillage dataset is not covered by this repository's license.** Check the dataset's own terms before redistributing any imagery.

---

## 🙏 Acknowledgements

- The **PlantVillage** project for the open dataset.
- **Cornell Cooperative Extension**, **UC IPM**, **UF/IFAS Extension** and **Penn State Extension** for the publicly available agronomic guidance the care knowledge base is built on.
- The **TensorFlow.js** team for making in-browser inference practical.

---

<div align="center">

**Built so that a farmer with no signal still gets an answer.**

</div>
