#!/usr/bin/env python3
"""
clean.py
Validates raw manifest images, filters corrupt files, and detects exact binary
duplicates using SHA-256 hashes across all datasets.
Accelerated with multi-threaded verification.
Outputs 01_data/cleaned_manifest.csv.
"""

import sys
import csv
import hashlib
import concurrent.futures
from pathlib import Path
from PIL import Image
from tqdm import tqdm

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_MANIFEST = REPO_ROOT / "01_data" / "raw_manifest.csv"
OUTPUT_MANIFEST = REPO_ROOT / "01_data" / "cleaned_manifest.csv"

def compute_sha256(file_path: Path) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def verify_and_hash(row: dict):
    rel_path = row["path"]
    abs_path = REPO_ROOT / rel_path

    if not abs_path.exists():
        return None, "missing"

    try:
        with Image.open(abs_path) as img:
            img.verify()
    except Exception as e:
        return None, f"corrupt: {e}"

    file_hash = compute_sha256(abs_path)
    res_row = dict(row)
    res_row["sha256"] = file_hash
    return res_row, None

def clean_manifest():
    if not INPUT_MANIFEST.exists():
        raise FileNotFoundError(f"Missing manifest: {INPUT_MANIFEST}")

    with open(INPUT_MANIFEST, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Loaded {len(rows)} image entries from {INPUT_MANIFEST}")

    seen_hashes = set()
    valid_rows = []
    corrupt_count = 0
    duplicate_count = 0

    print("Verifying images and computing SHA-256 with multi-threading...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for res_row, err in tqdm(executor.map(verify_and_hash, rows), total=len(rows), desc="Cleaning & Hashing"):
            if err:
                corrupt_count += 1
                continue
            h = res_row["sha256"]
            if h in seen_hashes:
                duplicate_count += 1
                continue
            seen_hashes.add(h)
            valid_rows.append(res_row)

    # Save cleaned manifest
    with open(OUTPUT_MANIFEST, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["path", "class_id", "crop", "dataset", "domain", "source_class", "sha256"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(valid_rows)

    print(f"\nCleaning complete:")
    print(f"  Valid unique images: {len(valid_rows)}")
    print(f"  Corrupt images removed: {corrupt_count}")
    print(f"  Exact duplicates removed: {duplicate_count}")
    print(f"  Output saved to: {OUTPUT_MANIFEST}")

if __name__ == "__main__":
    clean_manifest()
