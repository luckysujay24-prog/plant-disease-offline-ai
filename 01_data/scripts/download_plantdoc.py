#!/usr/bin/env python3
"""
download_plantdoc.py
Downloads PlantDoc archive directly from GitHub codeload with robust chunk streaming.
"""

import sys
import time
from pathlib import Path
import requests

def download_plantdoc():
    target_dir = Path("01_data/raw/downloads")
    target_dir.mkdir(parents=True, exist_ok=True)
    zip_path = target_dir / "plantdoc_master.zip"

    url = "https://codeload.github.com/pratikkayal/PlantDoc-Dataset/zip/refs/heads/master"
    print(f"Connecting to {url}...")

    t0 = time.time()
    resp = requests.get(url, stream=True, timeout=60)
    resp.raise_for_status()

    total_bytes = 0
    with open(zip_path, "wb") as f:
        for chunk in resp.iter_content(chunk_size=512 * 1024):
            if chunk:
                f.write(chunk)
                total_bytes += len(chunk)
                mb = total_bytes / (1024 * 1024)
                dt = time.time() - t0
                rate = mb / dt if dt > 0 else 0
                if int(mb) % 10 == 0:
                    print(f"Downloaded: {mb:.1f} MB ({rate:.2f} MB/s)", end="\r", flush=True)

    dt = time.time() - t0
    print(f"\nFinished PlantDoc download: {total_bytes / (1024 * 1024):.2f} MB in {dt:.1f}s")

if __name__ == "__main__":
    download_plantdoc()
