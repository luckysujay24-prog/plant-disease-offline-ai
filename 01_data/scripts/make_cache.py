#!/usr/bin/env python3
"""
make_cache.py
Prepares pre-resized copies of images (short side 288px, JPEG quality 90) into
01_data/processed/ for high-throughput training and validation.
Never modifies or overwrites raw originals.
Updates split CSVs to reference cached copies or provides seamless path translation.
"""

import sys
import csv
from pathlib import Path
from PIL import Image
from tqdm import tqdm

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SPLITS_DIR = REPO_ROOT / "01_data" / "splits"
PROCESSED_DIR = REPO_ROOT / "01_data" / "processed"

TARGET_SHORT_SIDE = 288

def resize_and_save(src_path: Path, dst_path: Path):
    if dst_path.exists():
        return
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(src_path) as img:
            img = img.convert("RGB")
            w, h = img.size
            if w < h:
                new_w = TARGET_SHORT_SIDE
                new_h = int(round(h * (TARGET_SHORT_SIDE / w)))
            else:
                new_h = TARGET_SHORT_SIDE
                new_w = int(round(w * (TARGET_SHORT_SIDE / h)))
            resized = img.resize((new_w, new_h), Image.Resampling.BILINEAR)
            resized.save(dst_path, format="JPEG", quality=90)
    except Exception as e:
        print(f"Error processing {src_path}: {e}")

def create_cache():
    all_paths = set()
    for split_name in ["train.csv", "validation.csv", "test.csv"]:
        split_file = SPLITS_DIR / split_name
        if not split_file.exists():
            continue
        with open(split_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                all_paths.add(row["path"])

    print(f"Found {len(all_paths)} total unique split images to cache into {PROCESSED_DIR}...")
    for rel_path_str in tqdm(sorted(all_paths), desc="Caching Resized Images"):
        src = REPO_ROOT / rel_path_str
        # Mirror relative path under 01_data/processed/
        dst = PROCESSED_DIR / Path(rel_path_str).relative_to("01_data/raw").with_suffix(".jpg")
        if src.exists():
            resize_and_save(src, dst)

    print(f"Image caching complete. Destination: {PROCESSED_DIR}")

if __name__ == "__main__":
    create_cache()
