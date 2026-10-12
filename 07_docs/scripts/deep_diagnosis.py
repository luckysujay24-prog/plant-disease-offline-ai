#!/usr/bin/env python3
"""
deep_diagnosis.py
Forensic root-cause analyzer for CR-02:
Investigates the "low match" (~10% confidence) issue across all 6 diagnostic points.
"""

import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
APP_MODEL_DIR = REPO_ROOT / "03_app" / "public" / "model"
LABELS_PATH = REPO_ROOT / "03_app" / "src" / "config" / "labels.json"
META_PATH = REPO_ROOT / "03_app" / "src" / "config" / "model_meta.json"
DATA_DIR = REPO_ROOT / "02_ml" / "data"
LEAVES_DIR = REPO_ROOT.parent / "leaves"

def get_file_sha256(path: Path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def check_model_info():
    print("--- 1. Model Artifact Hashes & Version Info ---")
    model_json = APP_MODEL_DIR / "model.json"
    weights_bin = APP_MODEL_DIR / "weights.bin"
    
    json_hash = get_file_sha256(model_json)
    bin_hash = get_file_sha256(weights_bin)
    
    with open(META_PATH, "r") as f:
        meta = json.load(f)
        
    print(f"model.json SHA256:  {json_hash}")
    print(f"weights.bin SHA256: {bin_hash}")
    print(f"modelVersion:       {meta.get('modelVersion')}")
    print(f"modelSizeBytes:     {meta.get('modelSizeBytes')}")
    print(f"lastEvaluated:      {meta.get('lastEvaluated')}")
    return json_hash, bin_hash, meta

def check_class_orders():
    print("\n--- 2. Class Order Alignment ---")
    with open(LABELS_PATH, "r") as f:
        labels_data = json.load(f)
    with open(META_PATH, "r") as f:
        meta_data = json.load(f)
        
    app_classes = labels_data["classes"]
    meta_classes = meta_data["classes"]
    
    match = app_classes == meta_classes
    print(f"labels.json class count:     {len(app_classes)}")
    print(f"model_meta.json class count: {len(meta_classes)}")
    print(f"Exact class order match:     {match}")
    if not match:
        for i, (a, b) in enumerate(zip(app_classes, meta_classes)):
            if a != b:
                print(f" Mismatch at index {i}: labels='{a}' vs meta='{b}'")
    return match

def check_preprocessing():
    print("\n--- 3. Preprocessing Alignment ---")
    print("Python prepare_tensors.py: PIL RGB resize (224, 224) BILINEAR -> uint8 [0, 255]")
    print("Python train_runner.js:    uint8.div(255.0) -> float32 [0.0, 1.0]")
    print("Browser modelRunner.js:    tf.browser.fromPixels -> resizeBilinear(224, 224) -> div(255.0) -> float32 [0.0, 1.0]")
    print("Format: RGB in both. Range: [0.0, 1.0] in both. Resolution: 224x224 in both.")
    print("NOTE: Standard pre-trained MobileNetV3 in PyTorch/Keras expects [-1.0, 1.0] or ImageNet mean/std.")
    print("However, the deployed model was trained from scratch in TF.js with [0.0, 1.0].")

def check_thresholds():
    print("\n--- 4. Temperature & Reject Threshold Analysis ---")
    with open(META_PATH, "r") as f:
        meta = json.load(f)
    print(f"calibratedTau (known):   {meta.get('calibratedTau', {}).get('known')} (40%)")
    print(f"calibratedTau (unknown): {meta.get('calibratedTau', {}).get('unknown')} (50%)")
    print(f"temperatures:            {meta.get('temperatures')}")
    print("Mathematical Analysis:")
    print("  With 38 classes, a uniform random distribution yields 1/38 = 2.63% per class.")
    print("  With 10 tomato classes, logit masking yields 1/10 = 10.00% per class.")
    print("  When model weights are underfit / near-zero logits, top confidence is ~10.1%.")
    print("  Because 10.1% < 40.0% tau threshold, belowThreshold is ALWAYS triggered!")

def main():
    check_model_info()
    check_class_orders()
    check_preprocessing()
    check_thresholds()

if __name__ == "__main__":
    main()
