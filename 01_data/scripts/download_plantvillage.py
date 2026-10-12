#!/usr/bin/env python3
"""
download_plantvillage.py
Downloads PlantVillage dataset (data.zip) from official author HuggingFace repository:
https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/data.zip
Extracts the color images (54,303 images across 38 classes) into 01_data/raw/plantvillage/
Supports resume if interrupted.
"""

import os
import sys
import time
import zipfile
import shutil
from pathlib import Path
import urllib.request
import ssl
import certifi

URL = "https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/data.zip"
BASE_DIR = Path(__file__).resolve().parent.parent
DOWNLOADS_DIR = BASE_DIR / "raw" / "downloads"
ZIP_PATH = DOWNLOADS_DIR / "plantvillage_data.zip"
TARGET_DIR = BASE_DIR / "raw" / "plantvillage"

def download_with_resume(url: str, dest_path: Path):
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    existing_size = dest_path.stat().st_size if dest_path.exists() else 0

    ctx = ssl.create_default_context(cafile=certifi.where())

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx) as resp:
        total_size = int(resp.headers.get("Content-Length", 0))

    if existing_size >= total_size and total_size > 0:
        print(f"File already completely downloaded: {dest_path} ({existing_size / (1024*1024):.2f} MB)")
        return

    headers = {"User-Agent": "Mozilla/5.0"}
    if existing_size > 0:
        print(f"Resuming download from byte {existing_size} ({existing_size / (1024*1024):.2f} MB / {total_size / (1024*1024):.2f} MB)...")
        headers["Range"] = f"bytes={existing_size}-"
    else:
        print(f"Starting download of {total_size / (1024*1024):.2f} MB to {dest_path}...")

    req = urllib.request.Request(url, headers=headers)
    mode = "ab" if existing_size > 0 else "wb"

    start_time = time.time()
    downloaded = existing_size
    chunk_size = 1024 * 1024 # 1 MB

    with urllib.request.urlopen(req, context=ctx) as resp, open(dest_path, mode) as f:
        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            elapsed = time.time() - start_time
            speed = (downloaded - existing_size) / (elapsed + 1e-6) / (1024 * 1024)
            pct = (downloaded / total_size) * 100 if total_size else 0
            sys.stdout.write(f"\rDownloaded {downloaded / (1024*1024):.1f} / {total_size / (1024*1024):.1f} MB ({pct:.1f}%) [{speed:.2f} MB/s]")
            sys.stdout.flush()

    print(f"\nDownload complete: {dest_path}")

def extract_color_dataset(zip_path: Path, target_dir: Path):
    print(f"\nOpening {zip_path.name} to inspect contents...")
    target_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        namelist = zf.namelist()
        print(f"Total entries in archive: {len(namelist)}")

        # Find prefix for color images
        color_entries = [n for n in namelist if "/color/" in n or n.startswith("color/")]
        if not color_entries:
            # Check data_distribution_for_SVM or raw
            color_entries = [n for n in namelist if "color" in n.lower() and (n.endswith(".jpg") or n.endswith(".JPG"))]

        print(f"Found {len(color_entries)} color image entries.")

        # Determine prefix to strip
        # Typical structure: data_distribution_for_SVM/color/<class_folder>/<image.jpg>
        # or raw/color/<class_folder>/<image.jpg>
        sample = [e for e in color_entries if e.endswith(".jpg") or e.endswith(".JPG")][0]
        print(f"Sample entry: {sample}")

        parts = sample.split("/")
        color_idx = -1
        for i, p in enumerate(parts):
            if p.lower() == "color":
                color_idx = i
                break

        print(f"Extracting color images into {target_dir}...")
        extracted_count = 0
        t0 = time.time()

        for member in color_entries:
            if member.endswith("/"):
                continue
            m_parts = member.split("/")
            if color_idx >= 0 and len(m_parts) > color_idx + 2:
                class_name = m_parts[color_idx + 1]
                filename = m_parts[-1]
                dest_file = target_dir / class_name / filename
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(member) as src, open(dest_file, "wb") as dst:
                    shutil.copyfileobj(src, dst)
                extracted_count += 1
                if extracted_count % 5000 == 0:
                    elapsed = time.time() - t0
                    print(f"  Extracted {extracted_count} images ({elapsed:.1f}s)...")

        print(f"Extraction finished! Total extracted images: {extracted_count}")

def verify_extracted(target_dir: Path):
    print(f"\nVerifying extracted dataset in {target_dir}...")
    subdirs = [d for d in target_dir.iterdir() if d.is_dir()]
    print(f"Number of class subdirectories: {len(subdirs)}")
    total_imgs = 0
    for d in sorted(subdirs):
        imgs = [f for f in d.iterdir() if f.is_file() and f.suffix.lower() in [".jpg", ".jpeg", ".png"]]
        total_imgs += len(imgs)
        print(f"  {d.name}: {len(imgs)} images")
    print(f"\nTotal verified color images: {total_imgs}")

def main():
    download_with_resume(URL, ZIP_PATH)
    extract_color_dataset(ZIP_PATH, TARGET_DIR)
    verify_extracted(TARGET_DIR)

if __name__ == "__main__":
    main()
