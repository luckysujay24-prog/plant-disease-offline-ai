# Experiment Protocol E3: Lab-to-Field Domain Shift Benchmark

## 1. Objective
Evaluate the generalization gap between laboratory-acquired imagery (PlantVillage, uniform backgrounds, controlled illumination) and complex in-field imagery (PlantDoc, unconstrained backgrounds, occlusions, varying illumination).

## 2. Metrics
- Accuracy on PlantVillage test partition (Lab)
- Accuracy on PlantDoc test partition (Field)
- Generalization gap: $\Delta_{domain} = Acc_{lab} - Acc_{field}$
- 95% Bootstrap Confidence Intervals (1,000 resamples).
