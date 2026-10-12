#!/usr/bin/env python3
"""
near_duplicates.py
Computes perceptual hashes (pHash) for all cleaned images and clusters near-duplicates
(e.g., transformed, cropped, or multi-view photos of the same leaf).
Ensures near-duplicate clusters are preserved as indivisible units for data splitting.
Optimized with integer bit_count and multi-threaded image hashing.
Outputs 01_data/clustered_manifest.csv.
"""

import sys
import csv
import concurrent.futures
from pathlib import Path
from PIL import Image
import imagehash
from tqdm import tqdm

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
INPUT_MANIFEST = REPO_ROOT / "01_data" / "cleaned_manifest.csv"
OUTPUT_MANIFEST = REPO_ROOT / "01_data" / "clustered_manifest.csv"

HAMMING_THRESHOLD = 4  # pHash distance <= 4 is considered a near-duplicate / transformed copy

def compute_single_phash(rel_path_str: str):
    abs_path = REPO_ROOT / rel_path_str
    try:
        with Image.open(abs_path) as img:
            h = imagehash.phash(img.convert("RGB"))
            h_int = int(str(h), 16)
            return rel_path_str, str(h), h_int
    except Exception as e:
        return rel_path_str, "0" * 16, 0

def cluster_manifest():
    if not INPUT_MANIFEST.exists():
        raise FileNotFoundError(f"Missing manifest: {INPUT_MANIFEST}")

    with open(INPUT_MANIFEST, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Loaded {len(rows)} image entries for perceptual hash clustering...")

    # Compute pHash in parallel across available CPU cores
    paths = [r["path"] for r in rows]
    hash_str_map = {}
    hash_int_map = {}

    print("Computing perceptual hashes (pHash) with multi-threading...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for rel_p, h_str, h_int in tqdm(executor.map(compute_single_phash, paths), total=len(paths), desc="pHash computation"):
            hash_str_map[rel_p] = h_str
            hash_int_map[rel_p] = h_int

    for r in rows:
        r["phash"] = hash_str_map[r["path"]]

    # Group by class_id to optimize distance comparisons
    class_groups = {}
    for idx, row in enumerate(rows):
        cid = row["class_id"]
        class_groups.setdefault(cid, []).append((idx, row))

    # Disjoint Set Union (DSU) for clustering
    parent = list(range(len(rows)))

    def find(i):
        if parent[i] == i:
            return i
        parent[i] = find(parent[i])
        return parent[i]

    def union(i, j):
        root_i = find(i)
        root_j = find(j)
        if root_i != root_j:
            parent[root_i] = root_j

    print(f"Clustering near-duplicates (Hamming distance <= {HAMMING_THRESHOLD}) using C-level bit_count...")
    cluster_merges = 0
    for cid, group in class_groups.items():
        n = len(group)
        # Pre-extract integer hashes for class
        int_hashes = [hash_int_map[item[1]["path"]] for item in group]
        indices = [item[0] for item in group]

        for i in range(n):
            idx_i = indices[i]
            hi = int_hashes[i]
            for j in range(i + 1, n):
                hj = int_hashes[j]
                if (hi ^ hj).bit_count() <= HAMMING_THRESHOLD:
                    union(idx_i, indices[j])
                    cluster_merges += 1

    # Map roots to unique cluster IDs
    cluster_map = {}
    current_cluster_id = 0
    for idx in range(len(rows)):
        root = find(idx)
        if root not in cluster_map:
            current_cluster_id += 1
            cluster_map[root] = f"cluster_{current_cluster_id:06d}"
        rows[idx]["cluster_id"] = cluster_map[root]

    # Save clustered manifest
    with open(OUTPUT_MANIFEST, "w", newline="", encoding="utf-8") as f:
        fieldnames = ["path", "class_id", "crop", "dataset", "domain", "source_class", "sha256", "phash", "cluster_id"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    num_clusters = len(cluster_map)
    print(f"\nClustering complete:")
    print(f"  Total images: {len(rows)}")
    print(f"  Total clusters: {num_clusters}")
    print(f"  Near-duplicate merges: {cluster_merges}")
    print(f"  Output saved to: {OUTPUT_MANIFEST}")

if __name__ == "__main__":
    cluster_manifest()
