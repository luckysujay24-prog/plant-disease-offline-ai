# Experiment Protocol E6: Network Fault Resilience & Idempotent Sync

## 1. Objective
Empirically evaluate the non-blocking background synchronization manager under simulated network degradation and server faults (0%, 10%, 30%, 50% simulated transient packet / 500 error rates).

## 2. Metrics
- Ingestion Success Rate (%)
- Duplicate Scan Ingestion Rate (% - must be exactly 0.0% due to UUID idempotency)
- Data Loss Rate (% - must be exactly 0.0% due to IndexedDB persistence invariant)
- Average Retries to Successful Sync under intermittent connectivity.
