# Empirical Benchmark Experiments (E1 to E7)

This directory details the 7 empirical benchmark experiments executed on the physical system in accordance with the Truthfulness Contract (Section 0.3).

## Summary Table of Verified Empirical Results

| Exp | Description | Key Metric | Measured Result | Source File |
| :--- | :--- | :--- | :--- | :--- |
| **E1** | **Architecture Benchmark** | Selected Model Size (M1) | **310 KB** (72,870 params) | `05_experiments/results/e1_architecture_benchmark.json` |
| | | Inference Latency (CPU) | **64.96 ms/image** | |
| **E2** | **Conditioning Gap** | Crop-Known vs Unknown Acc | **40.91% vs 3.03%** (+37.88% gain) | `05_experiments/results/e2_crop_conditioning_gap.json` |
| **E3** | **Domain Generalization** | PlantVillage (Lab) Acc | **40.14%** (142 test samples) | `05_experiments/results/e3_domain_shift.json` |
| | | PlantDoc (Field) Acc | **42.86%** (56 test samples) | |
| **E4** | **Confidence Calibration** | ECE / Calibrated $\tau$ | **0.0012** ECE ($\tau = 0.50$) | `05_experiments/results/e4_rejection_calibration.json` |
| **E5** | **Weather Hierarchy** | Latency: Live / Cache / Fallback | **642.0ms / 3.8ms / 0.4ms** | `05_experiments/results/e5_weather_hierarchy.json` |
| **E6** | **Cloud Sync Resilience** | Data Loss & Duplicate Rate | **0.0% / 0.0%** across 50% faults | `05_experiments/results/e6_sync_resilience.json` |
| **E7** | **Storage Footprint** | Total Storage (100 Scans) | **6.52 MB** (Warmup: 78.5ms) | `05_experiments/results/e7_storage_coldstart.json` |

---

## Reproducing Empirical Results

```bash
# 1. Re-run all experiment scripts
node 05_experiments/scripts/run_all_experiments.js

# 2. Re-generate visual figures
python 05_experiments/scripts/plot_figures.py

# 3. Validate numeric claims in the paper
python 06_paper/check_numbers.py
```
