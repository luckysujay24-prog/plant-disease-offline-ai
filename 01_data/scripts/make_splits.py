#!/usr/bin/env python3
"""
make_splits.py
Creates leakage-free train.csv, validation.csv, and test.csv splits by cluster
for the single unified PlantVillage dataset (CR-02).
Rules:
- Stratified 70% train, 15% val, 15% test by cluster_id.
- Zero cluster leakage across splits.
Outputs to 01_data/splits/train.csv, validation.csv, test.csv.
"""

import sys
import csv
import random
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_MANIFEST = REPO_ROOT / "01_data" / "clustered_manifest.csv"
SPLITS_DIR = REPO_ROOT / "01_data" / "splits"

RANDOM_SEED = 42

def make_splits():
    if not INPUT_MANIFEST.exists():
        raise FileNotFoundError(f"Missing manifest: {INPUT_MANIFEST}")

    random.seed(RANDOM_SEED)

    with open(INPUT_MANIFEST, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = [r for r in reader if r.get("dataset") == "plantvillage"]

    print(f"Loaded {len(rows)} PlantVillage clustered entries for split creation.")

    # Group rows by cluster_id
    cluster_rows = defaultdict(list)
    for r in rows:
        cluster_rows[r["cluster_id"]].append(r)

    # Group clusters by class_id for stratified splitting
    class_clusters = defaultdict(list)
    for cid, r_list in cluster_rows.items():
        cls_id = r_list[0]["class_id"]
        class_clusters[cls_id].append((cid, r_list))

    train_rows = []
    val_rows = []
    test_rows = []

    # 70 / 15 / 15 stratified split by cluster for each class
    for cls_id, clusters in sorted(class_clusters.items()):
        random.shuffle(clusters)
        n = len(clusters)
        n_train = max(1, int(round(n * 0.70)))
        n_val = max(1, int(round(n * 0.15))) if n >= 3 else 0
        n_test = n - n_train - n_val
        if n_test <= 0 and n >= 2:
            n_train -= 1
            n_test = 1

        for idx, (cid_key, c_items) in enumerate(clusters):
            if idx < n_train:
                train_rows.extend(c_items)
            elif idx < (n_train + n_val):
                val_rows.extend(c_items)
            else:
                test_rows.extend(c_items)

    SPLITS_DIR.mkdir(parents=True, exist_ok=True)
    fieldnames = ["path", "class_id", "crop", "dataset", "domain", "cluster_id"]

    for name, data in [("train.csv", train_rows), ("validation.csv", val_rows), ("test.csv", test_rows)]:
        out_file = SPLITS_DIR / name
        with open(out_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(data)
        print(f"Saved {name}: {len(data)} images ({out_file})")

    print(f"\nSplits creation complete! Total: {len(train_rows) + len(val_rows) + len(test_rows)} images.")

if __name__ == "__main__":
    make_splits()
