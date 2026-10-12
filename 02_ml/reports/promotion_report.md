# Model Promotion Evaluation Report (Section 3.8)

**Evaluated Models**:
- **Baseline**: M1 MobileNetV3-Small (`modelVersion: 1.0.0`)
- **Candidate**: M1-Robust MobileNetV3-Small (`modelVersion: 1.1.0`)

---

## 1. Promotion Criteria Evaluation

### Condition 1: PlantVillage Test Accuracy Retention
- Baseline PV Accuracy: **40.14%** (95% CI: [35.64%, 44.64%])
- Candidate PV Accuracy: **40.85%**
- Threshold: $\ge 35.64%$
- Outcome: **PASS** (Retention verified within statistical margin)

### Condition 2: Performance on Degraded & Field Imagery
- Average Degraded Accuracy (JPEG Quality 10-90 + Blur):
  - Baseline: **32.9%**
  - Candidate: **36.3%** (+3.3% gain)
- Severe JPEG Compression (Q=10):
  - Baseline: **19.8%**
  - Candidate: **27.8%** (+8.0% gain)
- Outcome: **PASS**

---

## 2. Final Promotion Decision

- **Verdict**: **PROMOTED AS CANDIDATE MODEL v1.1.0**
- Both models are maintained in the repository:
  - Baseline model files: `02_ml/models/tfjs/` (v1.0.0, 72,870 weights, 310 KB)
  - Both versions are reported side-by-side in the research paper and documentation.
