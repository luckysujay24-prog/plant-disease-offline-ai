#!/usr/bin/env python3
"""
apply_mapping.py
Scans raw dataset folders, applies YAML mappings from 01_data/mappings/,
and produces a single raw manifest CSV containing:
path, class_id, crop, dataset, domain, source_class
"""

import sys
import os
import csv
from pathlib import Path
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "01_data" / "raw"
MAPPINGS_DIR = REPO_ROOT / "01_data" / "mappings"
REGISTRY_FILE = REPO_ROOT / "01_data" / "class_registry.yaml"
OUTPUT_MANIFEST = REPO_ROOT / "01_data" / "raw_manifest.csv"

VALID_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".JPG", ".JPEG", ".PNG"}

def load_yaml(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def build_manifest():
    if not REGISTRY_FILE.exists():
        raise FileNotFoundError(f"Missing registry: {REGISTRY_FILE}")
    registry = load_yaml(REGISTRY_FILE)
    valid_classes = {c["class_id"]: c for c in registry.get("classes", [])}

    manifest_rows = []
    excluded_count = 0
    mapped_count = 0

    mapping_files = list(MAPPINGS_DIR.glob("*.yaml")) + list(MAPPINGS_DIR.glob("*.yml"))
    print(f"Found {len(mapping_files)} dataset mapping files in {MAPPINGS_DIR}")

    for map_file in mapping_files:
        config = load_yaml(map_file)
        dataset_name = config.get("dataset")
        domain = config.get("domain", "lab")
        mappings = config.get("mappings", {})

        dataset_raw_dir = RAW_DIR / dataset_name
        if not dataset_raw_dir.exists():
            print(f"Notice: Raw directory {dataset_raw_dir} does not exist yet. Skipping.")
            continue

        print(f"Processing dataset: {dataset_name} ({domain})")

        # Walk through dataset directory
        for root, dirs, files in os.walk(dataset_raw_dir):
            root_path = Path(root)
            folder_name = root_path.name

            # Check if this folder matches a mapping
            if folder_name in mappings:
                rule = mappings[folder_name]
                target_class = rule.get("target")

                if target_class == "EXCLUDED" or not target_class:
                    excluded_count += len([f for f in files if Path(f).suffix in VALID_IMAGE_EXTS])
                    continue

                if target_class not in valid_classes:
                    print(f"Warning: Unknown target class '{target_class}' in {map_file.name}. Excluding.")
                    continue

                crop = valid_classes[target_class]["crop"]

                for file in sorted(files):
                    file_path = root_path / file
                    if file_path.suffix in VALID_IMAGE_EXTS:
                        manifest_rows.append({
                            "path": str(file_path.relative_to(REPO_ROOT)).replace("\\", "/"),
                            "class_id": target_class,
                            "crop": crop,
                            "dataset": dataset_name,
                            "domain": domain,
                            "source_class": folder_name
                        })
                        mapped_count += 1

    # Write manifest
    OUTPUT_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_MANIFEST, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["path", "class_id", "crop", "dataset", "domain", "source_class"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(manifest_rows)

    print(f"\nManifest generated: {OUTPUT_MANIFEST}")
    print(f"Total mapped images: {mapped_count}")
    print(f"Excluded images: {excluded_count}")

if __name__ == "__main__":
    build_manifest()
