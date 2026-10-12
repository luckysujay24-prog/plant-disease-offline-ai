#!/usr/bin/env python3
"""
prepare_tensors.py
Converts images from split CSV manifests into compact uint8 NumPy arrays
for ultra-fast, zero-overhead training and evaluation across both Python and Node.
Preserves exact class order from labels.json.
"""

import sys
import json
import csv
from pathlib import Path
import numpy as np
from PIL import Image
from tqdm import tqdm

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SPLITS_DIR = REPO_ROOT / "01_data" / "splits"
LABELS_FILE = REPO_ROOT / "01_data" / "labels.json"
OUTPUT_DIR = REPO_ROOT / "02_ml" / "data"

IMG_SIZE = 224

def build_split_tensors(split_name: str, class_to_idx: dict):
    csv_path = SPLITS_DIR / f"{split_name}.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing {csv_path}")

    with open(csv_path, "r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    num_samples = len(rows)
    print(f"Packaging {split_name} ({num_samples} samples)...")

    x_arr = np.zeros((num_samples, IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
    y_arr = np.zeros((num_samples,), dtype=np.int32)
    meta_rows = []

    for i, row in enumerate(tqdm(rows, desc=f"Processing {split_name}")):
        rel_path = row["path"]
        abs_path = REPO_ROOT / rel_path
        with Image.open(abs_path) as img:
            img = img.convert("RGB").resize((IMG_SIZE, IMG_SIZE), Image.Resampling.BILINEAR)
            x_arr[i] = np.array(img, dtype=np.uint8)
        cid = row["class_id"]
        y_arr[i] = class_to_idx[cid]
        meta_rows.append(row)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    np.save(OUTPUT_DIR / f"{split_name}_x.npy", x_arr)
    np.save(OUTPUT_DIR / f"{split_name}_y.npy", y_arr)

    # Save meta json
    with open(OUTPUT_DIR / f"{split_name}_meta.json", "w", encoding="utf-8") as f:
        json.dump(meta_rows, f, indent=2)

    print(f"Saved: {split_name}_x.npy ({x_arr.nbytes / (1024*1024):.1f} MB), {split_name}_y.npy")

def main():
    with open(LABELS_FILE, "r", encoding="utf-8") as f:
        labels_data = json.load(f)
    class_to_idx = labels_data["classToIndex"]

    for s in ["train", "validation", "test"]:
        build_split_tensors(s, class_to_idx)
    print("\nAll split tensors generated successfully in 02_ml/data/!")

if __name__ == "__main__":
    main()
