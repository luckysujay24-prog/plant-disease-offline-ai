# Experiment Protocol E7: Storage Footprint & Cold Start Profile

## 1. Objective
Quantify the total on-device storage footprint and warm-up latency of the offline PWA across all lifecycle phases:
- Base PWA Application Shell (HTML, CSS, JS bundles)
- Serialized Edge Model Shards (`model.json` + `weights.bin`)
- Agro-climatic knowledge bases and seasonal profiles
- Simulated user history of 100 diagnoses with 640px compressed leaf JPEG images in IndexedDB.

## 2. Metrics
- Storage Footprint (KB / MB) breakdown
- Model Cold Start & Warm-up Latency (ms)
- First Contentful Paint (FCP) and Time-to-Interactive (TTI) offline.
