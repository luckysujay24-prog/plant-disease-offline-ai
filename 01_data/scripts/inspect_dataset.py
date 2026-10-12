#!/usr/bin/env python3
"""
inspect_dataset.py
Scans dataset directories to list classes, image counts, dimensions, file formats,
and detects any corrupt files.
"""

import sys
import os
import argparse
from pathlib import Path
from PIL import Image

def inspect_directory(data_dir: Path):
    print(f"=== Inspecting Dataset Directory: {data_dir} ===")
    if not data_dir.exists():
        print(f"Error: Directory {data_dir} does not exist.")
        return

    classes = [d for d in data_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
    if not classes:
        print(f"No subdirectories (classes) found in {data_dir}.")
        return

    print(f"Found {len(classes)} candidate class directories.\n")
    total_images = 0
    corrupt_count = 0
    formats = {}
    class_counts = {}

    for cls in sorted(classes):
        image_files = [f for f in cls.glob('*') if f.is_file() and not f.name.startswith('.')]
        class_counts[cls.name] = len(image_files)
        total_images += len(image_files)

        for img_path in image_files:
            try:
                with Image.open(img_path) as img:
                    fmt = img.format or "UNKNOWN"
                    formats[fmt] = formats.get(fmt, 0) + 1
                    img.verify()
            except Exception as e:
                corrupt_count += 1
                print(f"Corrupt image detected: {img_path} ({e})")

    print(f"Total images found: {total_images}")
    print(f"Corrupt images: {corrupt_count}")
    print(f"File formats: {formats}")
    print("\nPer-class counts:")
    for cls_name, count in sorted(class_counts.items()):
        print(f"  {cls_name}: {count}")

def main():
    parser = argparse.ArgumentParser(description="Inspect dataset folder for classes, formats, and corrupt files.")
    parser.add_argument("data_dir", type=str, help="Path to raw dataset folder")
    args = parser.parse_args()
    inspect_directory(Path(args.data_dir))

if __name__ == "__main__":
    main()
