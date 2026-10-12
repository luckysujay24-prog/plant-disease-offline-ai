#!/usr/bin/env python3
"""
evaluate_pytorch.py
Evaluates the trained MobileNetV3-Small model on:
1. Held-out test split (8,251 images from 01_data/splits/test.csv)
2. User's real leaf photos from ../leaves/
Outputs metrics_test.json, confusion_matrix.json, and updates MODEL_CARD.md.
"""

import sys
import os
import json
import csv
import time
from pathlib import Path
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = REPO_ROOT / "02_ml" / "models"
REPORTS_DIR = REPO_ROOT / "02_ml" / "reports"
DATA_SPLITS_DIR = REPO_ROOT / "01_data" / "splits"
LABELS_FILE = REPO_ROOT / "01_data" / "labels.json"
USER_LEAVES_DIR = REPO_ROOT.parent / "leaves"

from train_pytorch import MobileNetV3SmallTFJS, PlantVillageDataset

def compute_ece(probs, targets, n_bins=10):
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    n = len(targets)
    for b in range(n_bins):
        low, high = bin_boundaries[b], bin_boundaries[b + 1]
        mask = (probs >= low) & (probs < high) if b < n_bins - 1 else (probs >= low) & (probs <= high)
        if np.sum(mask) > 0:
            bin_acc = np.mean(targets[mask])
            bin_conf = np.mean(probs[mask])
            bin_weight = np.sum(mask) / n
            ece += bin_weight * np.abs(bin_acc - bin_conf)
    return float(ece)

def evaluate_model():
    print("=======================================================")
    print("Evaluating Model on Held-Out Test Split (PlantVillage)")
    print("=======================================================")

    with open(LABELS_FILE, "r", encoding="utf-8") as f:
        labels_data = json.load(f)
    classes = labels_data["classes"]
    class_to_idx = labels_data["classToIndex"]
    num_classes = labels_data["totalClasses"]

    model = MobileNetV3SmallTFJS(num_classes=num_classes)
    weights_path = MODELS_DIR / "best_model.pt"
    if not weights_path.exists():
        raise FileNotFoundError(f"Missing weights: {weights_path}")

    model.load_state_dict(torch.load(weights_path, map_location="cpu"))
    model.eval()

    test_csv = DATA_SPLITS_DIR / "test.csv"
    test_ds = PlantVillageDataset(test_csv, class_to_idx, is_train=False)
    test_loader = DataLoader(test_ds, batch_size=128, shuffle=False, num_workers=0)

    print(f"Loaded {len(test_ds)} test images across {num_classes} classes.")

    all_preds = []
    all_targets = []
    all_top3 = []
    all_max_probs = []

    t0 = time.time()
    with torch.no_grad():
        for imgs, labels in test_loader:
            outputs = model(imgs)
            probs = torch.softmax(outputs, dim=1).numpy()
            targets = labels.numpy()

            preds = np.argmax(probs, axis=1)
            top3 = np.argsort(probs, axis=1)[:, -3:]
            max_probs = np.max(probs, axis=1)

            all_preds.extend(preds)
            all_targets.extend(targets)
            all_top3.extend(top3)
            all_max_probs.extend(max_probs)

    eval_time = time.time() - t0
    latency_ms = (eval_time / len(test_ds)) * 1000

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)
    all_top3 = np.array(all_top3)
    all_max_probs = np.array(all_max_probs)

    # Top-1 and Top-3 accuracy
    top1_correct = np.sum(all_preds == all_targets)
    top1_acc = float(top1_correct / len(all_targets))

    top3_correct = np.sum([all_targets[i] in all_top3[i] for i in range(len(all_targets))])
    top3_acc = float(top3_correct / len(all_targets))

    # Confusion matrix
    conf_matrix = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(all_targets, all_preds):
        conf_matrix[t, p] += 1

    # Per-class metrics
    per_class = {}
    precisions, recalls, f1s = [], [], []
    for c_idx, c_name in enumerate(classes):
        tp = conf_matrix[c_idx, c_idx]
        fp = np.sum(conf_matrix[:, c_idx]) - tp
        fn = np.sum(conf_matrix[c_idx, :]) - tp
        support = int(np.sum(conf_matrix[c_idx, :]))

        prec = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = float(2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        precisions.append(prec)
        recalls.append(rec)
        f1s.append(f1)

        per_class[c_name] = {
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "support": support
        }

    macro_f1 = float(np.mean(f1s))
    weighted_f1 = float(np.average(f1s, weights=[per_class[c]["support"] for c in classes]))

    # Calibration (ECE)
    correct_mask = (all_preds == all_targets).astype(int)
    ece = compute_ece(all_max_probs, correct_mask)

    print(f"\n================ Test Results ================")
    print(f"Top-1 Accuracy:     {top1_acc*100:.2f}% ({top1_correct}/{len(all_targets)})")
    print(f"Top-3 Accuracy:     {top3_acc*100:.2f}% ({top3_correct}/{len(all_targets)})")
    print(f"Macro-F1:           {macro_f1*100:.2f}%")
    print(f"Weighted-F1:        {weighted_f1*100:.2f}%")
    print(f"ECE (Calibration):  {ece:.4f}")
    print(f"Inference Latency:  {latency_ms:.2f} ms/image")
    print(f"==============================================\n")

    # Save metrics
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    metrics_path = REPORTS_DIR / "metrics_test.json"
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump({
            "testSamples": len(all_targets),
            "top1Accuracy": round(top1_acc, 4),
            "top3Accuracy": round(top3_acc, 4),
            "macroF1": round(macro_f1, 4),
            "weightedF1": round(weighted_f1, 4),
            "ece": round(ece, 4),
            "latencyMsPerImage": round(latency_ms, 2),
            "perClassMetrics": per_class
        }, f, indent=2)

    conf_path = REPORTS_DIR / "confusion_matrix.json"
    with open(conf_path, "w", encoding="utf-8") as f:
        json.dump({
            "classes": classes,
            "matrix": conf_matrix.tolist()
        }, f, indent=2)

    # -------------------------------------------------------------
    # Evaluate User's Real Leaf Photos
    # -------------------------------------------------------------
    print("=======================================================")
    print("Evaluating User's Real Photos in ../leaves/")
    print("=======================================================")

    user_results = {}
    if USER_LEAVES_DIR.exists():
        for img_path in USER_LEAVES_DIR.glob("*.webp"):
            with Image.open(img_path) as img:
                img_rgb = img.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
                arr = np.array(img_rgb, dtype=np.float32) / 255.0
                tensor = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)

            with torch.no_grad():
                out = model(tensor)
                probs = torch.softmax(out, dim=1)[0].numpy()

            top3_idx = np.argsort(probs)[-3:][::-1]
            top3_list = [
                {"class": classes[idx], "confidence": round(float(probs[idx]), 4), "percentage": f"{probs[idx]*100:.1f}%"}
                for idx in top3_idx
            ]
            user_results[img_path.name] = top3_list
            print(f"\nPhoto: {img_path.name}")
            for rank, item in enumerate(top3_list, start=1):
                print(f"  Rank {rank}: {item['class']} -> {item['percentage']}")

    user_results_path = REPORTS_DIR / "user_photos_predictions.json"
    with open(user_results_path, "w", encoding="utf-8") as f:
        json.dump(user_results, f, indent=2)

    return top1_acc, macro_f1

if __name__ == "__main__":
    evaluate_model()
