#!/usr/bin/env python3
"""
stream_extract_color.py
Streams the color images of PlantVillage (bytes 326,494,635 to 847,643,210)
directly from HuggingFace and unpacks them on-the-fly into 01_data/raw/plantvillage/
with automatic resume/retry support.
"""

import sys
import time
import struct
import zlib
import urllib.request
import ssl
import certifi
from pathlib import Path

URL = "https://huggingface.co/datasets/mohanty/PlantVillage/resolve/main/data.zip"
CTX = ssl.create_default_context(cafile=certifi.where())

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
TARGET_DIR = REPO_ROOT / "01_data" / "raw" / "plantvillage"

TOTAL_START = 326494635
TOTAL_END = 847643210  # byte where raw/segmented/ begins

def stream_and_extract():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    total_range = TOTAL_END - TOTAL_START
    print(f"Streaming and extracting PlantVillage color images ({total_range / (1024*1024):.1f} MB)...")

    current_byte = TOTAL_START
    extracted_count = 0
    buffer = bytearray()
    chunk_size = 4 * 1024 * 1024  # 4MB chunks
    t0 = time.time()
    last_print = 0

    while current_byte < TOTAL_END:
        try:
            req = urllib.request.Request(URL, headers={
                "User-Agent": "Mozilla/5.0",
                "Range": f"bytes={current_byte}-{TOTAL_END}"
            })

            with urllib.request.urlopen(req, context=CTX, timeout=30) as resp:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk and len(buffer) == 0:
                        break
                    if chunk:
                        buffer.extend(chunk)
                        current_byte += len(chunk)

                    # Parse zip entries from buffer
                    while len(buffer) >= 30:
                        if buffer[:4] != b'\x50\x4b\x03\x04':
                            # Search for next local header signature
                            idx = buffer.find(b'\x50\x4b\x03\x04', 1)
                            if idx == -1:
                                buffer = buffer[-3:]
                                break
                            else:
                                buffer = buffer[idx:]
                                continue

                        # Parse header
                        comp_method, mod_time, mod_date, crc, comp_size, uncomp_size, fn_len, extra_len = struct.unpack('<HHHIIIHH', buffer[8:30])
                        header_size = 30 + fn_len + extra_len
                        total_entry_size = header_size + comp_size

                        if len(buffer) < total_entry_size:
                            # Incomplete entry, need more data from stream
                            break

                        fn_bytes = buffer[30:30+fn_len]
                        fn = fn_bytes.decode('utf-8', errors='ignore')
                        data_bytes = buffer[header_size:total_entry_size]

                        # Advance buffer
                        buffer = buffer[total_entry_size:]

                        if fn.startswith('raw/color/') and not fn.endswith('/'):
                            parts = fn.split('/')
                            if len(parts) >= 4:
                                class_name = parts[2]
                                filename = parts[3]
                                out_file = TARGET_DIR / class_name / filename
                                out_file.parent.mkdir(parents=True, exist_ok=True)

                                try:
                                    if comp_method == 8:
                                        img_data = zlib.decompress(data_bytes, -zlib.MAX_WBITS)
                                    else:
                                        img_data = bytes(data_bytes)

                                    with open(out_file, 'wb') as out_f:
                                        out_f.write(img_data)
                                    extracted_count += 1
                                except Exception as e:
                                    print(f"\nError decompressing {fn}: {e}")

                        elif fn.startswith('raw/segmented/') or fn.startswith('raw/grayscale/'):
                            print(f"\nReached end of color files: {fn}")
                            print(f"Total extracted: {extracted_count} images in {time.time() - t0:.1f}s.")
                            return

                    now = time.time()
                    if now - last_print > 1.0:
                        elapsed = now - t0
                        bytes_read = current_byte - TOTAL_START
                        speed = (bytes_read / (1024*1024)) / (elapsed + 1e-6)
                        pct = (bytes_read / total_range) * 100
                        sys.stdout.write(f"\rProgress: {bytes_read / (1024*1024):.1f}/{total_range / (1024*1024):.1f} MB ({pct:.1f}%) | Extracted: {extracted_count} images | Speed: {speed:.2f} MB/s")
                        sys.stdout.flush()
                        last_print = now

                    if not chunk:
                        break

        except Exception as e:
            print(f"\nStream interrupted ({e}). Resuming from byte {current_byte} in 3s...")
            time.sleep(3)

    print(f"\nFinished streaming extraction! Newly extracted: {extracted_count} images in {time.time() - t0:.1f}s.")

if __name__ == "__main__":
    stream_and_extract()
