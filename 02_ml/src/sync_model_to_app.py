#!/usr/bin/env python3
"""
sync_model_to_app.py
Synchronizes exported TF.js model artifacts and labels.json into the PWA frontend.
Sources:
- 02_ml/models/tfjs/ (model.json, weights.bin, etc.)
- 01_data/labels.json
- 02_ml/models/model_meta.json
Destinations:
- 03_app/public/model/
- 03_app/src/config/
Never hand-copy.
"""

import sys
import shutil
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

SRC_TFJS = REPO_ROOT / "02_ml" / "models" / "tfjs"
SRC_LABELS = REPO_ROOT / "01_data" / "labels.json"
SRC_META = REPO_ROOT / "02_ml" / "models" / "model_meta.json"

DST_APP_PUBLIC_MODEL = REPO_ROOT / "03_app" / "public" / "model"
DST_APP_CONFIG = REPO_ROOT / "03_app" / "src" / "config"

def sync_artifacts():
    print("=== Syncing Model & Config Artifacts to Frontend PWA ===")

    # 1. Sync TF.js model shards to 03_app/public/model/
    if not SRC_TFJS.exists():
        raise FileNotFoundError(f"Source model directory missing: {SRC_TFJS}")

    DST_APP_PUBLIC_MODEL.mkdir(parents=True, exist_ok=True)
    for item in SRC_TFJS.iterdir():
        if item.is_file():
            dst_file = DST_APP_PUBLIC_MODEL / item.name
            shutil.copy2(item, dst_file)
            print(f"Copied: {item.name} -> {dst_file}")

    # 2. Sync labels.json and model_meta.json to 03_app/src/config/
    DST_APP_CONFIG.mkdir(parents=True, exist_ok=True)

    if SRC_LABELS.exists():
        shutil.copy2(SRC_LABELS, DST_APP_CONFIG / "labels.json")
        print(f"Copied: labels.json -> {DST_APP_CONFIG / 'labels.json'}")

    if SRC_META.exists():
        shutil.copy2(SRC_META, DST_APP_CONFIG / "model_meta.json")
        print(f"Copied: model_meta.json -> {DST_APP_CONFIG / 'model_meta.json'}")

    print("\nSynchronization completed successfully!")

if __name__ == "__main__":
    sync_artifacts()
