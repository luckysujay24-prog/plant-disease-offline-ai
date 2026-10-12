# Experiment Protocol E5: Weather Hierarchy & Fallback Accuracy

## 1. Objective
Measure latency and agro-climatic fidelity across the three-tier weather fallback hierarchy:
- Tier 1: Live Open-Meteo REST API call (online)
- Tier 2: IndexedDB cached weather snapshot (recently offline)
- Tier 3: Pre-bundled 30-year agro-climatic normal fallback profile (fully offline cold start).

## 2. Metrics
- Retrieval Latency (ms): Live vs Cached vs Fallback
- Mean Absolute Deviation (MAD) of fallback temperature (°C), relative humidity (%), and precipitation (mm) against live observations across 5 demo districts (Guntur, Nashik, Shimla, Varanasi, Coimbatore).
