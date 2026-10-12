#!/usr/bin/env python3
"""
generate_labels_json.py
Generates canonical labels.json from 01_data/class_registry.yaml.
Maintains deterministic class ordering, crop-to-index mappings, and taxonomyVersion.
Syncs to 01_data/labels.json and 03_app/src/config/labels.json.
"""

import sys
import json
from pathlib import Path
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
REGISTRY_FILE = REPO_ROOT / "01_data" / "class_registry.yaml"
OUT_DATA_FILE = REPO_ROOT / "01_data" / "labels.json"
OUT_APP_FILE = REPO_ROOT / "03_app" / "src" / "config" / "labels.json"

def generate_labels():
    if not REGISTRY_FILE.exists():
        raise FileNotFoundError(f"Registry not found: {REGISTRY_FILE}")

    with open(REGISTRY_FILE, "r", encoding="utf-8") as f:
        registry = yaml.safe_load(f)

    taxonomy_version = registry.get("taxonomyVersion", "1.0.0")
    crops_def = registry.get("crops", {})
    classes_def = [c for c in registry.get("classes", []) if c.get("status") == "active"]

    # Deterministic alphabetical sort by class_id
    classes_def.sort(key=lambda x: x["class_id"])

    class_names = [c["class_id"] for c in classes_def]
    class_to_idx = {cid: idx for idx, cid in enumerate(class_names)}
    idx_to_class = {idx: cid for idx, cid in enumerate(class_names)}

    # Map each crop to its valid class indices
    crop_to_class_indices = {}
    for crop_slug in crops_def:
        indices = [idx for idx, c in enumerate(classes_def) if c["crop"] == crop_slug]
        crop_to_class_indices[crop_slug] = indices

    # Display mappings
    crop_display_names = {slug: data.get("displayName", slug) for slug, data in crops_def.items()}
    class_display_names = {c["class_id"]: c.get("displayName", c["class_id"]) for c in classes_def}
    class_pathogen_types = {c["class_id"]: c.get("pathogen_type", "unknown") for c in classes_def}

    labels_data = {
        "taxonomyVersion": taxonomy_version,
        "classes": class_names,
        "classToIndex": class_to_idx,
        "indexToClass": idx_to_class,
        "crops": list(crops_def.keys()),
        "cropToClassIndices": crop_to_class_indices,
        "cropDisplayNames": crop_display_names,
        "classDisplayNames": class_display_names,
        "classPathogenTypes": class_pathogen_types,
        "totalClasses": len(class_names),
        "totalCrops": len(crops_def),
    }

    # Write to 01_data/labels.json
    OUT_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(labels_data, f, indent=2)
    print(f"Generated: {OUT_DATA_FILE} ({len(class_names)} classes across {len(crops_def)} crops)")

    # Write to 03_app/src/config/labels.json
    OUT_APP_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_APP_FILE, "w", encoding="utf-8") as f:
        json.dump(labels_data, f, indent=2)
    print(f"Generated: {OUT_APP_FILE}")

if __name__ == "__main__":
    generate_labels()
