# Experiment Protocol E4: Rejection Option & Calibration Analysis

## 1. Objective
Quantify Expected Calibration Error (ECE), probability reliability, and the trade-off between coverage and selective diagnostic accuracy across confidence rejection thresholds $\tau \in [0.10, 0.90]$.

## 2. Metrics
- Expected Calibration Error (ECE) with 10 equal-width confidence bins.
- Temperature scaling parameter $T$.
- Coverage at threshold $\tau$: proportion of samples where $\max_k P(y=k|x) \ge \tau$.
- Accuracy on retained samples.
