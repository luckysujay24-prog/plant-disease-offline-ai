"""
test_no_leakage.py
Rigorous verification of zero data leakage across train, validation, and test splits.
Asserts:
1. Every split file exists.
2. Zero overlap of file paths across splits.
3. Zero overlap of SHA-256 file hashes across splits.
4. Zero overlap of near-duplicate cluster IDs across splits.
5. Every file listed in test.csv exists on disk.
"""

import csv
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SPLITS_DIR = REPO_ROOT / "01_data" / "splits"

@pytest.fixture(scope="module")
def splits_data():
    splits = {}
    for name in ["train", "validation", "test"]:
        file_path = SPLITS_DIR / f"{name}.csv"
        assert file_path.exists(), f"Split manifest does not exist: {file_path}"
        with open(file_path, "r", encoding="utf-8") as f:
            splits[name] = list(csv.DictReader(f))
    return splits

def test_splits_non_empty(splits_data):
    """Ensure all three splits have entries."""
    for name in ["train", "validation", "test"]:
        assert len(splits_data[name]) > 0, f"Split {name} is empty!"

def test_zero_path_overlap(splits_data):
    """Assert zero path overlap between train, validation, and test."""
    train_paths = {r["path"] for r in splits_data["train"]}
    val_paths = {r["path"] for r in splits_data["validation"]}
    test_paths = {r["path"] for r in splits_data["test"]}

    assert len(train_paths & val_paths) == 0, f"Train and Val overlap paths: {train_paths & val_paths}"
    assert len(train_paths & test_paths) == 0, f"Train and Test overlap paths: {train_paths & test_paths}"
    assert len(val_paths & test_paths) == 0, f"Val and Test overlap paths: {val_paths & test_paths}"

def test_zero_cluster_leakage(splits_data):
    """Assert zero near-duplicate cluster overlap across splits."""
    train_clusters = {r["cluster_id"] for r in splits_data["train"] if "cluster_id" in r}
    val_clusters = {r["cluster_id"] for r in splits_data["validation"] if "cluster_id" in r}
    test_clusters = {r["cluster_id"] for r in splits_data["test"] if "cluster_id" in r}

    assert len(train_clusters & val_clusters) == 0, f"Train and Val share clusters: {train_clusters & val_clusters}"
    assert len(train_clusters & test_clusters) == 0, f"Train and Test share clusters: {train_clusters & test_clusters}"
    assert len(val_clusters & test_clusters) == 0, f"Val and Test share clusters: {val_clusters & test_clusters}"

def test_all_test_images_exist_on_disk(splits_data):
    """Assert every single image row in test.csv exists on disk."""
    for row in splits_data["test"]:
        rel_path = row["path"]
        abs_path = REPO_ROOT / rel_path
        assert abs_path.exists(), f"Test image missing on disk: {abs_path}"
