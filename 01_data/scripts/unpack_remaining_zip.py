#!/usr/bin/env python3
"""
unpack_remaining_zip.py
Safely unpacks completed images from 01_data/raw/downloads/remaining_color.zip
directly into 01_data/raw/plantvillage/
"""

import sys
import os
import time
import struct
import zlib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DOWNLOADS_DIR = REPO_ROOT / "01_data" / "raw" / "downloads"
TARGET_DIR = REPO_ROOT / "01_data" / "raw" / "plantvillage"
ZIP_FILE = DOWNLOADS_DIR / "remaining_color.zip"

def unpack():
    if not ZIP_FILE.exists():
        print(f"Error: {ZIP_FILE} does not exist.")
        sys.exit(1)

    file_size_mb = ZIP_FILE.stat().st_size / (1024 * 1024)
    print(f"Unpacking entries from {ZIP_FILE.name} ({file_size_mb:.1f} MB)...")

    t0 = time.time()
    extracted = 0

    with open(ZIP_FILE, "rb") as f:
        while True:
            hdr = f.read(30)
            if len(hdr) < 30 or hdr[:4] != b'\x50\x4b\x03\x04':
                break

            comp_method, mod_time, mod_date, crc, comp_size, uncomp_size, fn_len, extra_len = struct.unpack('<HHHIIIHH', hdr[8:30])
            fn = f.read(fn_len).decode('utf-8', errors='ignore')
            f.seek(extra_len, 1)  # Skip extra field
            data_bytes = f.read(comp_size)
            if len(data_bytes) < comp_size:
                # Partial entry currently being written by downloader
                break

            if fn.startswith('raw/color/') and not fn.endswith('/'):
                parts = fn.split('/')
                if len(parts) >= 4:
                    class_name = parts[2]
                    filename = parts[3]
                    out_path = TARGET_DIR / class_name / filename
                    out_path.parent.mkdir(parents=True, exist_ok=True)

                    try:
                        if comp_method == 8:
                            decomp = zlib.decompress(data_bytes, -zlib.MAX_WBITS)
                        else:
                            decomp = data_bytes

                        with open(out_path, "wb") as img_f:
                            img_f.write(decomp)
                        extracted += 1
                    except zlib.error:
                        # Corrupted or truncated entry at file end
                        break

            elif fn.startswith('raw/segmented/') or fn.startswith('raw/grayscale/'):
                print(f"Reached end of color files: {fn}")
                break

    elapsed = time.time() - t0
    print(f"Extracted {extracted} images in {elapsed:.1f}s.")

if __name__ == "__main__":
    unpack()
