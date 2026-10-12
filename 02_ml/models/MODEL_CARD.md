# Model Card: Multi-Crop MobileNetV3-Small Edge Classifier

> **Model Architecture**: Inverted Bottleneck with Depthwise Separable Convolutions  
> **Target Deployment**: In-Browser Client Inference (TensorFlow.js WebGL / WASM)  
> **Taxonomy Version**: 1.0.0  
> **Input Specification**: 224 x 224 x 3 RGB (normalized [0, 1])

---

## 1. Intended Use & Deployment Context

This lightweight convolutional neural network is designed for offline, on-device foliar diagnosis of plant diseases.
It operates in two distinct diagnostic modes:
1. **Crop-Known Mode (Primary)**: The farmer selects the crop prior to diagnosis. Logits for non-matching crops are masked to zero before softmax normalization, preventing impossible cross-species predictions.
2. **Crop-Unknown Mode**: Unconstrained 38-class softmax prediction with hierarchical crop probability aggregation.

---

## 2. Quantitative Performance Metrics (Held-Out Test Partition)

Every number below reflects empirical evaluation on the zero-leakage test split (198 samples):

| Evaluation Metric | Measured Value | 95% Confidence Interval |
|---|---|---|
| **Crop-Unknown All-Class Accuracy** | 3.0% | [1.0%, 5.6%] |
| **Crop-Known Condition Accuracy** | 40.9% | - |
| **Crop Identification Accuracy** | 27.8% | - |
| **PlantVillage Test Accuracy (Lab Domain)** | 2.8% | [0.7%, 5.6%] |
| **PlantDoc Test Accuracy (Field Domain)** | 3.6% | [0.0%, 8.9%] |
| **Expected Calibration Error (ECE)** | 0.0012 | - |
| **Reject Option Coverage (tau = 0.5)** | 0.0% | (Acc @ tau: 0.0%) |
| **Inference Latency (per image, CPU)** | 64.96 ms | - |

---

## 3. Calibration & Uncertainty Handling

- **Temperature Scaling**: Calibrated parameter $T = 1.05$ applied to logit distributions.
- **Reject Option**: Below confidence threshold $\tau = 0.50$, the application triggers a graceful fallback notice: *"Not sure, please retake the photo"*, directing the user to adherence tips (single leaf, clear lighting, frame fill).

---

## 4. Supported Classes (38 Total)

1. `apple__apple_scab`
2. `apple__black_rot`
3. `apple__cedar_apple_rust`
4. `apple__healthy`
5. `bell_pepper__bacterial_spot`
6. `bell_pepper__healthy`
7. `blueberry__healthy`
8. `cherry__healthy`
9. `cherry__powdery_mildew`
10. `corn__common_rust`
11. `corn__gray_leaf_spot`
12. `corn__healthy`
13. `corn__northern_leaf_blight`
14. `grape__black_rot`
15. `grape__esca`
16. `grape__healthy`
17. `grape__leaf_blight_isariopsis`
18. `orange__citrus_greening`
19. `peach__bacterial_spot`
20. `peach__healthy`
21. `potato__early_blight`
22. `potato__healthy`
23. `potato__late_blight`
24. `raspberry__healthy`
25. `soybean__healthy`
26. `squash__powdery_mildew`
27. `strawberry__healthy`
28. `strawberry__leaf_scorch`
29. `tomato__bacterial_spot`
30. `tomato__early_blight`
31. `tomato__healthy`
32. `tomato__late_blight`
33. `tomato__leaf_mold`
34. `tomato__mosaic_virus`
35. `tomato__septoria_leaf_spot`
36. `tomato__target_spot`
37. `tomato__two_spotted_spider_mite`
38. `tomato__yellow_leaf_curl_virus`
