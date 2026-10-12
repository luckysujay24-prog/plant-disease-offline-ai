#!/usr/bin/env python3
"""
download_remaining_fast.py
Downloads the remaining 355 MB of PlantVillage color images (bytes 475012697 to 847643210)
using 3 parallel curl processes, stitches them into a single contiguous binary,
and unpacks all entries directly into 01_data/raw/plantvillage/.
"""

import sys
import os
import time
import struct
import zlib
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DOWNLOADS_DIR = REPO_ROOT / "01_data" / "raw" / "downloads"
TARGET_DIR = REPO_ROOT / "01_data" / "raw" / "plantvillage"

URL = "https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/data.zip"

CHUNKS = [
    (475012697, 599000000, DOWNLOADS_DIR / "chunk0.bin"),
    (599000001, 723000000, DOWNLOADS_DIR / "chunk1.bin"),
    (723000001, 847643210, DOWNLOADS_DIR / "chunk2.bin"),
]

def download_chunks():
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    procs = []
    print("Starting 3 parallel curl downloads for remaining 355 MB...")
    t0 = time.time()

    for start_b, end_b, out_file in CHUNKS:
        # Check if chunk already downloaded
        expected_size = end_b - start_b + 1
        if out_file.exists() and out_file.stat().st_size == expected_size:
            print(f"Chunk already complete: {out_file.name} ({expected_size / (1024*1024):.1f} MB)")
            continue

        cmd = [
            "curl.exe",
            "-s", "-L",
            "--retry", "5",
            "--retry-delay", "2",
            "-r", f"{start_b}-{end_b}",
            "-o", str(out_file),
            URL
        ]
        p = subprocess.Popen(cmd)
        procs.append((p, out_file, expected_size))

    if procs:
        print(f"Launched {len(procs)} parallel curl download workers.")
        while True:
            alive = [p for p, _, _ in procs if p.poll() is None]
            done_bytes = sum(f.stat().st_size for _, f, _ in procs if f.exists())
            elapsed = time.time() - t0
            sys.stdout.write(f"\rDownloading: {done_bytes / (1024*1024):.1f} MB downloaded in {elapsed:.1f}s | Active workers: {len(alive)}")
            sys.stdout.flush()
            if not alive:
                break
            time.sleep(1)

        # Check return codes
        for p, out_file, exp in procs:
            if p.returncode != 0:
                raise RuntimeError(f"curl failed for {out_file.name} with code {p.returncode}")
            if out_file.stat().st_size != exp:
                raise RuntimeError(f"Chunk size mismatch for {out_file.name}: got {out_file.stat().st_size}, expected {exp}")

    print(f"\nAll chunks downloaded successfully in {time.time() - t0:.1f}s!")

def unpack_remaining():
    combined_file = DOWNLOADS_DIR / "remaining_color.bin"
    print("Concatenating chunks into remaining_color.bin...")
    with open(combined_file, "wb") as out_f:
        for _, _, chunk_file in CHUNKS:
            with open(chunk_file, "rb") as in_f:
                while block := in_f.read(8 * 1024 * 1024):
                    out_f.write(block)
    print(f"Combined size: {combined_file.stat().st_size / (1024*1024):.1f} MB")

    print("Unpacking remaining color images into 01_data/raw/plantvillage/...")
    t0 = time.time()
    extracted = 0

    with open(combined_file, "rb") as f:
        while True:
            hdr = f.read(30)
            if len(hdr) < 30:
                break
            if hdr[:4] != b'\x50\x4b\x03\x04':
                # Find next signature
                break

            comp_method, mod_time, mod_date, crc, comp_size, uncomp_size, fn_len, extra_len = struct.unpack('<HHHIIIHH', hdr[8:30])
            fn = f.read(fn_len).decode('utf-8', errors='ignore')
            f.seek(extra_len, 1)  # Skip extra
            data_bytes = f.read(comp_size)

            if fn.startswith('raw/color/') and not fn.endswith('/'):
                parts = fn.split('/')
                if len(parts) >= 4:
                    class_name = parts[2]
                    filename = parts[3]
                    out_path = TARGET_DIR / class_name / filename
                    out_path.parent.mkdir(parents=True, exist_ok=True)

                    if comp_method == 8:
                        decomp = zlib.decompress(data_bytes, -zlib.MAX_WBITS)
                    else:
                        decomp = data_bytes

                    with open(out_path, "wb") as img_f:
                        img_f.write(decomp)
                    extracted += 1

            elif fn.startswith('raw/segmented/') or fn.startswith('raw/grayscale/'):
                print(f"Reached end of color files: {fn}")
                break

    print(f"Extracted {extracted} images in {time.time() - t0:.1f}s.")

    # Clean up temporary chunk files
    print("Cleaning up temporary chunk files...")
    for _, _, chunk_file in CHUNKS:
        chunk_file.unlink(missing_ok=True)
    combined_file.unlink(missing_ok=True)
    print("Cleanup done!")

if __name__ == "__main__":
    download_chunks()
    unpack_remaining()
