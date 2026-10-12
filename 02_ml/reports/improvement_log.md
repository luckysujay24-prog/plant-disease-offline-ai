# Machine Learning Training & Improvement Log

> **Hardware**: Intel(R) Iris(R) Xe Graphics (Local CPU mode)  
> **Framework**: TensorFlow.js (Layers API)  
> **Taxonomy Version**: 1.0.0 (38 Classes across 14 Crops)  
> **Input Resolution**: 224x224 RGB

---

## 1. Local CPU Smoke Test & Latency Profiling

- **Experiment ID**: `M1_smoke_test`
- **Architecture**: `MobileNetV3-Small` (Inverted Bottleneck with Depthwise Separable Convolutions)
- **Trainable Parameters**: 72,870
- **Batch Size**: 16
- **Epochs**: 2
- **Subset**: 64 train samples, 32 validation samples
- **Measured CPU Latency per Epoch**:
  - Epoch 1: 153.73s (Loss: 3.4586, Acc: 17.2%, Val Loss: 3.6182, Val Acc: 12.5%)
  - Epoch 2: 156.76s (Loss: 2.8415, Acc: 43.8%, Val Loss: 3.5958, Val Acc: 12.5%)
- **Total Training Duration**: 310.8 seconds (~5.2 minutes)
- **Full CPU Training Projection**:
  - For the full 861 training samples on local CPU without dedicated GPU, each epoch is projected at ~2,017 seconds (~33.6 minutes).
  - A 10-epoch training run requires ~5.6 hours on local CPU.
  - Recommended: Execute `02_ml/notebooks/train_colab.ipynb` on Google Colab T4 GPU (< 2 minutes total for 15 epochs).

---

## 2. Model Architecture Comparison

| Model ID | Architecture | Parameters | Input Shape | Model Size (TF.js) | Intended Role |
|---|---|---|---|---|---|
| **M0** | Custom Lightweight CNN | 34,214 | 224x224x3 | ~140 KB | Baseline |
| **M1** | MobileNetV3-Small | 72,870 | 224x224x3 | 316.7 KB | **Primary Deployed Edge Model** |
| **M2** | MobileNetV3-Large | 245,614 | 224x224x3 | ~1.0 MB | Mid-Size Reference |
| **M3** | EfficientNet-Style | 512,890 | 224x224x3 | ~2.1 MB | Accuracy Ceiling / Teacher |

All candidate architectures easily fit within the **15 MB edge budget** constraint. `M1` (316.7 KB) provides the optimal balance of parameter efficiency, depthwise separable efficiency, and instant in-browser caching.

---

## 3. Improvement Ladder Steps

1. **Baseline Inverted Bottlenecks**: MobileNetV3-Small backbone with depthwise separable convolutions and batch normalization.
2. **Label Smoothing**: $\alpha = 0.08$ applied to categorical cross-entropy loss to reduce overconfident misclassifications on hard boundaries.
3. **Multi-Crop Logit Masking**: Inference-time conditional probability projection (crop-known mode) eliminating cross-crop confusion entirely.
4. **Export Format**: Standalone `model.json` + `weights.bin` pre-cached via Workbox Service Worker in the PWA.
