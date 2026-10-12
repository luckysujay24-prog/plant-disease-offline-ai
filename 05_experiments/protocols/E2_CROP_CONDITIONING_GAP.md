# Experiment Protocol E2: Crop-Known vs Crop-Unknown Conditioning Gap

## 1. Objective
Quantify the performance differential when the model is conditioned on the farmer's prior knowledge of the crop (`cropMode = 'known'`) versus predicting without prior knowledge across all 38 classes (`cropMode = 'unknown'`).

## 2. Hypothesis
Logit masking over the subset of classes corresponding to the selected crop will eliminate cross-crop false positives and significantly enhance Top-1 diagnostic accuracy in realistic agricultural workflows.

## 3. Metrics
- Top-1 Accuracy (Crop-Known vs Crop-Unknown)
- Conditioning Gain $\Delta_{acc} = Acc_{known} - Acc_{unknown}$
- Crop-level breakdown across all 14 supported crops.
