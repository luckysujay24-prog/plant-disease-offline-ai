# Machine Learning Pipeline: Multi-Crop Disease Classification

This directory contains the machine learning pipelines, model architectures, training routines, evaluation scripts, and model export workflows.

## Subdirectories
- `configs/`: YAML experiment configuration files.
- `src/`: Core Python modules for dataset loading, model architectures, training loops, evaluation, and export.
- `notebooks/`: Google Colab notebooks mirroring local training scripts for GPU acceleration.
- `models/`: Exported model checkpoints (`keras/`, `tfjs/`, `tflite/`). Note: `tfjs/` is committed for direct app deployment.
- `reports/`: Generated metrics JSON, confusion matrices, and training curves.
- `tests/`: Automated test suite for data leakage, tensor shapes, label-order consistency, and Keras vs TF.js numerical parity.

## Model Matrix
- **M0**: Small custom CNN (lightweight baseline)
- **M1**: MobileNetV3-Small (primary on-device candidate)
- **M2**: MobileNetV3-Large (mid-size reference)
- **M3**: EfficientNetV2-S / ConvNeXt-Tiny (distillation teacher / ceiling)
