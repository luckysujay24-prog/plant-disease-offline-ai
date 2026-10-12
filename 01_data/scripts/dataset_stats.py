#!/usr/bin/env python3
"""
dataset_stats.py
Analyzes train, validation, and test split manifests and generates comprehensive
statistical reports in 01_data/reports/dataset_stats.md and dataset_stats.csv.
Reports:
- images per class x split x dataset
- imbalance ratios
- crops per dataset
- lab vs field breakdown
"""

import sys
import csv
from pathlib import Path
from collections import defaultdict

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SPLITS_DIR = REPO_ROOT / "01_data" / "splits"
REPORTS_DIR = REPO_ROOT / "01_data" / "reports"

def generate_stats():
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    splits_data = {}
    for s_name in ["train", "validation", "test"]:
        s_file = SPLITS_DIR / f"{s_name}.csv"
        if s_file.exists():
            with open(s_file, "r", encoding="utf-8") as f:
                splits_data[s_name] = list(csv.DictReader(f))
        else:
            splits_data[s_name] = []

    # Aggregations
    class_counts = defaultdict(lambda: {"train": 0, "validation": 0, "test": 0, "total": 0})
    dataset_counts = defaultdict(lambda: {"train": 0, "validation": 0, "test": 0, "total": 0})
    domain_counts = defaultdict(lambda: {"train": 0, "validation": 0, "test": 0, "total": 0})
    crop_counts = defaultdict(lambda: {"train": 0, "validation": 0, "test": 0, "total": 0})

    for s_name, rows in splits_data.items():
        for r in rows:
            cid = r["class_id"]
            ds = r["dataset"]
            dom = r["domain"]
            crop = r["crop"]

            class_counts[cid][s_name] += 1
            class_counts[cid]["total"] += 1

            dataset_counts[ds][s_name] += 1
            dataset_counts[ds]["total"] += 1

            domain_counts[dom][s_name] += 1
            domain_counts[dom]["total"] += 1

            crop_counts[crop][s_name] += 1
            crop_counts[crop]["total"] += 1

    total_images = sum(d["total"] for d in dataset_counts.values())

    # Write CSV
    out_csv = REPORTS_DIR / "dataset_stats.csv"
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["class_id", "crop", "train", "validation", "test", "total"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for cid in sorted(class_counts.keys()):
            crop = cid.split("__")[0]
            counts = class_counts[cid]
            writer.writerow({
                "class_id": cid,
                "crop": crop,
                "train": counts["train"],
                "validation": counts["validation"],
                "test": counts["test"],
                "total": counts["total"],
            })

    # Write Markdown
    out_md = REPORTS_DIR / "dataset_stats.md"
    with open(out_md, "w", encoding="utf-8") as f:
        f.write("# Dataset Partition & Distribution Statistics\n\n")
        f.write(f"**Total Verified Images**: {total_images}\n\n")

        f.write("## 1. Domain Breakdown (Lab vs. Field)\n\n")
        f.write("| Domain | Train | Validation | Test | Total Images | % of Total |\n")
        f.write("|---|---|---|---|---|---|\n")
        for dom, cnt in sorted(domain_counts.items()):
            pct = (cnt['total'] / total_images * 100) if total_images else 0
            f.write(f"| {dom.capitalize()} | {cnt['train']} | {cnt['validation']} | {cnt['test']} | {cnt['total']} | {pct:.1f}% |\n")

        f.write("\n## 2. Dataset Breakdown\n\n")
        f.write("| Dataset | Train | Validation | Test | Total Images |\n")
        f.write("|---|---|---|---|---|\n")
        for ds, cnt in sorted(dataset_counts.items()):
            f.write(f"| {ds} | {cnt['train']} | {cnt['validation']} | {cnt['test']} | {cnt['total']} |\n")

        f.write("\n## 3. Crop Breakdown\n\n")
        f.write("| Crop | Train | Validation | Test | Total Images |\n")
        f.write("|---|---|---|---|---|\n")
        for crop, cnt in sorted(crop_counts.items()):
            f.write(f"| {crop} | {cnt['train']} | {cnt['validation']} | {cnt['test']} | {cnt['total']} |\n")

        f.write("\n## 4. Class-Level Distributions & Imbalance\n\n")
        f.write("| Class ID | Train | Val | Test | Total |\n")
        f.write("|---|---|---|---|---|\n")
        counts_list = [c["total"] for c in class_counts.values() if c["total"] > 0]
        max_c = max(counts_list) if counts_list else 1
        min_c = min(counts_list) if counts_list else 1
        imbalance_ratio = max_c / min_c if min_c else 0

        for cid in sorted(class_counts.keys()):
            cnt = class_counts[cid]
            f.write(f"| `{cid}` | {cnt['train']} | {cnt['validation']} | {cnt['test']} | {cnt['total']} |\n")

        f.write(f"\n**Class Imbalance Ratio (Max:Min)**: {imbalance_ratio:.2f}:1 (Max: {max_c}, Min: {min_c})\n")

    print(f"Stats written to:\n  {out_csv}\n  {out_md}")

if __name__ == "__main__":
    generate_stats()
