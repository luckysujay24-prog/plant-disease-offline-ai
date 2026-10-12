#!/usr/bin/env python3
"""
download_chunks_pipeline.py
Sequentially downloads 10 MB chunks of PlantVillage color images using curl with a 15s max-time limit.
Unpacks all completed entries directly into 01_data/raw/plantvillage/,
and dynamically advances the start offset based on the last valid unpacked entry.
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

TOTAL_START = 564583951
TOTAL_END = 847643210
CHUNK_BYTES = 10 * 1024 * 1024  # 10 MB chunks for fast burst speed

def run_pipeline():
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
    TARGET_DIR.mkdir(parents=True, exist_ok=True)

    curr_start = TOTAL_START
    chunk_idx = 0
    total_extracted = 0
    t0 = time.time()

    print(f"Starting resilient 10MB chunk pipeline from byte {curr_start} to {TOTAL_END} ({(TOTAL_END - curr_start)/(1024*1024):.1f} MB remaining)...", flush=True)

    while curr_start < TOTAL_END:
        chunk_idx += 1
        curr_end = min(curr_start + CHUNK_BYTES, TOTAL_END)
        chunk_file = DOWNLOADS_DIR / f"pipeline_chunk_{chunk_idx}.bin"
        chunk_file.unlink(missing_ok=True)

        req_bytes = curr_end - curr_start + 1
        pct = ((curr_start - TOTAL_START) / (TOTAL_END - TOTAL_START)) * 100
        print(f"\n[Chunk {chunk_idx}] Offset {curr_start} ({pct:.1f}%) | Requesting {req_bytes/(1024*1024):.1f} MB...", flush=True)

        # Download chunk via curl with strict 15-second max time limit
        cmd = [
            "curl.exe",
            "-s", "-L",
            "--max-time", "15",
            "-r", f"{curr_start}-{curr_end}",
            "-o", str(chunk_file),
            URL
        ]
        t_dl0 = time.time()
        res = subprocess.run(cmd)
        dl_time = time.time() - t_dl0

        if not chunk_file.exists() or chunk_file.stat().st_size == 0:
            print(f"Empty or missing chunk file, retrying in 2s...", flush=True)
            time.sleep(2)
            continue

        dl_size = chunk_file.stat().st_size
        speed_mbs = (dl_size / (1024*1024)) / (dl_time + 1e-6)
        print(f"Received {dl_size / (1024*1024):.1f} MB in {dl_time:.1f}s ({speed_mbs:.2f} MB/s). Unpacking entries...", flush=True)

        # Parse zip entries from chunk_file
        extracted_in_chunk = 0
        last_good_offset = 0

        with open(chunk_file, "rb") as f:
            data = f.read()

        pos = 0
        while pos + 30 <= len(data):
            if data[pos:pos+4] != b'\x50\x4b\x03\x04':
                next_sig = data.find(b'\x50\x4b\x03\x04', pos + 1)
                if next_sig == -1:
                    break
                pos = next_sig

            if pos + 30 > len(data):
                break

            comp_method, mod_time, mod_date, crc, comp_size, uncomp_size, fn_len, extra_len = struct.unpack('<HHHIIIHH', data[pos+8:pos+30])
            header_size = 30 + fn_len + extra_len
            entry_end = pos + header_size + comp_size

            if entry_end > len(data):
                break

            fn = data[pos+30:pos+30+fn_len].decode('utf-8', errors='ignore')
            comp_data = data[pos+header_size:entry_end]

            if fn.startswith('raw/color/') and not fn.endswith('/'):
                parts = fn.split('/')
                if len(parts) >= 4:
                    class_name = parts[2]
                    filename = parts[3]
                    out_path = TARGET_DIR / class_name / filename
                    out_path.parent.mkdir(parents=True, exist_ok=True)

                    try:
                        if comp_method == 8:
                            decomp = zlib.decompress(comp_data, -zlib.MAX_WBITS)
                        else:
                            decomp = comp_data

                        with open(out_path, "wb") as img_f:
                            img_f.write(decomp)
                        extracted_in_chunk += 1
                        total_extracted += 1
                    except Exception as e:
                        pass

            elif fn.startswith('raw/segmented/') or fn.startswith('raw/grayscale/'):
                print(f"Reached end of color files: {fn}", flush=True)
                chunk_file.unlink(missing_ok=True)
                print(f"\nPipeline finished! Extracted {total_extracted} images in {time.time() - t0:.1f}s.", flush=True)
                return

            pos = entry_end
            last_good_offset = pos

        # Clean up chunk file immediately
        chunk_file.unlink(missing_ok=True)

        if last_good_offset == 0:
            print("No complete entry found in chunk, incrementing offset by chunk size.", flush=True)
            curr_start = curr_start + dl_size
        else:
            curr_start = curr_start + last_good_offset

        print(f"Extracted {extracted_in_chunk} images from chunk {chunk_idx}. Total: {total_extracted}", flush=True)

    print(f"\nAll chunks complete! Total images extracted: {total_extracted} in {time.time() - t0:.1f}s.", flush=True)

if __name__ == "__main__":
    run_pipeline()
