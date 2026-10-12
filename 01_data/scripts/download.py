#!/usr/bin/env python3
"""
download.py
Downloads and extracts Tier 1 datasets (PlantVillage and PlantDoc) into 01_data/raw/
Sources:
- PlantVillage: HuggingFace mohanty/PlantVillage (original raw data.zip from author Sharada Mohanty)
- PlantDoc: Official GitHub pratikkayal/PlantDoc-Dataset master archive
"""

import os
import sys
import zipfile
import shutil
from pathlib import Path
import urllib.request
import ssl
import certifi
from tqdm import tqdm

RAW_DIR = Path(__file__).resolve().parent.parent / "raw"

class DownloadProgressBar(tqdm):
    def update_to(self, b=1, bsize=1, tsize=None):
        if tsize is not None:
            self.total = tsize
        self.update(b * bsize - self.n)

def download_file(url: str, output_path: Path, desc: str):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists() and output_path.stat().st_size > 0:
        print(f"File already exists: {output_path} ({output_path.stat().st_size / (1024*1024):.2f} MB)")
        return

    print(f"Downloading {desc} from {url}...")
    ctx = ssl.create_default_context(cafile=certifi.where())
    opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ctx))
    urllib.request.install_opener(opener)

    with DownloadProgressBar(unit='B', unit_scale=True, miniters=1, desc=desc) as t:
        urllib.request.urlretrieve(url, filename=str(output_path), reporthook=t.update_to)
    print(f"Downloaded to {output_path}")

def extract_archive(zip_path: Path, target_dir: Path):
    print(f"Extracting {zip_path.name} to {target_dir}...")
    target_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(target_dir)
    print(f"Extraction complete for {zip_path.name}")

def setup_plantdoc():
    plantdoc_raw = RAW_DIR / "plantdoc"
    if (plantdoc_raw / "train").exists() and (plantdoc_raw / "test").exists():
        print("PlantDoc already extracted.")
        return

    zip_file = RAW_DIR / "downloads" / "plantdoc_master.zip"
    url = "https://github.com/pratikkayal/PlantDoc-Dataset/archive/refs/heads/master.zip"
    download_file(url, zip_file, "PlantDoc Master Zip")

    extract_tmp = RAW_DIR / "downloads" / "plantdoc_extracted"
    extract_archive(zip_file, extract_tmp)

    nested_dir = extract_tmp / "PlantDoc-Dataset-master"
    if nested_dir.exists():
        plantdoc_raw.mkdir(parents=True, exist_ok=True)
        if (nested_dir / "train").exists():
            if (plantdoc_raw / "train").exists():
                shutil.rmtree(plantdoc_raw / "train")
            shutil.move(str(nested_dir / "train"), str(plantdoc_raw / "train"))
        if (nested_dir / "test").exists():
            if (plantdoc_raw / "test").exists():
                shutil.rmtree(plantdoc_raw / "test")
            shutil.move(str(nested_dir / "test"), str(plantdoc_raw / "test"))
        if (nested_dir / "LICENSE.txt").exists():
            shutil.copy(str(nested_dir / "LICENSE.txt"), str(plantdoc_raw / "LICENSE.txt"))
        print("PlantDoc setup finished successfully.")

def setup_plantvillage():
    plantvillage_raw = RAW_DIR / "plantvillage"
    if (plantvillage_raw / "color").exists():
        print("PlantVillage color dataset already extracted.")
        return

    zip_file = RAW_DIR / "downloads" / "plantvillage_data.zip"
    url = "https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/data.zip"
    download_file(url, zip_file, "PlantVillage data.zip")

    print(f"Extracting PlantVillage color images from {zip_file}...")
    plantvillage_raw.mkdir(parents=True, exist_ok=True)

    # Extract specifically the 'raw/color' folder to save space and time
    with zipfile.ZipFile(zip_file, 'r') as zf:
        members = [m for m in zf.namelist() if m.startswith("data_distribution_for_SVM/color/") or m.startswith("raw/color/")]
        if not members:
            # Check general structure
            members = [m for m in zf.namelist() if "/color/" in m or m.startswith("color/")]
        print(f"Found {len(members)} color image files in archive. Extracting...")
        for member in tqdm(members, desc="Extracting color images"):
            zf.extract(member, plantvillage_raw)

    print("PlantVillage color images extracted successfully.")

def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    (RAW_DIR / "downloads").mkdir(parents=True, exist_ok=True)

    print("=== Step 1: Downloading & Setting up PlantDoc ===")
    setup_plantdoc()

    print("\n=== Step 2: Downloading & Setting up PlantVillage ===")
    setup_plantvillage()

if __name__ == "__main__":
    main()
