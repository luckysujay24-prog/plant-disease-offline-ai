# Experiment Protocol E1: Edge AI Model Architecture & Efficiency Benchmark

## 1. Objective
Compare neural network architectures (M0 Custom CNN, M1 MobileNetV3-Small, M2 MobileNetV3-Large, M3 EfficientNet-Lite) for browser-based offline deployment.
Metrics:
- Parameter count
- Quantized weight size on disk (KB / MB)
- CPU inference latency (ms/image)
- Top-1 accuracy under Crop-Known and Crop-Unknown evaluation.

## 2. Methodology
1. Evaluate models using identical 224x224 RGB inputs.
2. Measure latency across test images on the local evaluation CPU runtime.
3. Quantify serialized web artifacts (JSON architecture graph + binary weight shards).

## 3. Acceptance Criteria
- Model size <= 15 MB (PWA precache threshold).
- CPU latency <= 250 ms/image for acceptable user experience on commodity hardware.
