#!/usr/bin/env python3
"""
train_pytorch.py
High-accuracy PyTorch training of the MobileNetV3-Small architecture for PlantVillage.
Mirroring createMobileNetV3Small in models.js for 100% mathematical parity with TF.js.
Exports trained weights directly to 02_ml/models/tfjs/weights.bin according to model.json.
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
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_SPLITS_DIR = REPO_ROOT / "01_data" / "splits"
LABELS_FILE = REPO_ROOT / "01_data" / "labels.json"
MODELS_DIR = REPO_ROOT / "02_ml" / "models"
TFJS_DIR = MODELS_DIR / "tfjs"
REPORTS_DIR = REPO_ROOT / "02_ml" / "reports"

# -------------------------------------------------------------
# 1. Dataset Definition
# -------------------------------------------------------------
class PlantVillageDataset(Dataset):
    def __init__(self, csv_file: Path, class_to_idx: dict, is_train: bool = False):
        self.is_train = is_train
        self.samples = []
        with open(csv_file, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                rel_path = row["path"]
                cid = row["class_id"]
                if cid in class_to_idx:
                    self.samples.append((REPO_ROOT / rel_path, class_to_idx[cid]))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        with Image.open(path) as img:
            img = img.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
            if self.is_train:
                if np.random.rand() > 0.5:
                    img = img.transpose(Image.FLIP_LEFT_RIGHT)
                if np.random.rand() > 0.5:
                    img = img.transpose(Image.FLIP_TOP_BOTTOM)
            arr = np.array(img, dtype=np.float32) / 255.0  # [224, 224, 3] in [0, 1]
            tensor = torch.from_numpy(arr).permute(2, 0, 1)  # [3, 224, 224]
        return tensor, label

# -------------------------------------------------------------
# 2. Model Architecture (1:1 with models.js createMobileNetV3Small)
# -------------------------------------------------------------
class DepthwiseSeparableBlock(nn.Module):
    def __init__(self, in_channels, out_channels, stride=1):
        super().__init__()
        # Depthwise Conv (kernel_size=3, padding=1)
        self.depthwise = nn.Conv2d(
            in_channels, in_channels, kernel_size=3,
            stride=stride, padding=1, groups=in_channels, bias=False
        )
        # Pointwise Conv (kernel_size=1) with bias to match SeparableConv2D in TF.js
        self.pointwise = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=True)
        # Batch Normalization
        self.bn = nn.BatchNorm2d(out_channels, eps=0.001, momentum=0.01) # momentum 0.01 in PyTorch = 0.99 in Keras
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x = self.depthwise(x)
        x = self.pointwise(x)
        x = self.bn(x)
        return self.relu(x)

class MobileNetV3SmallTFJS(nn.Module):
    def __init__(self, num_classes=38):
        super().__init__()
        # Stem Conv: Conv2d(3, 16, 3, stride=2, padding=1) + BN + ReLU
        self.stem_conv = nn.Conv2d(3, 16, kernel_size=3, stride=2, padding=1, bias=True)
        self.stem_bn = nn.BatchNorm2d(16, eps=0.001, momentum=0.01)
        self.stem_relu = nn.ReLU(inplace=True)

        # Inverted Bottleneck / Depthwise Separable stages
        self.block1 = DepthwiseSeparableBlock(16, 24, stride=2)
        self.block2 = DepthwiseSeparableBlock(24, 40, stride=2)
        self.block3 = DepthwiseSeparableBlock(40, 48, stride=1)
        self.block4 = DepthwiseSeparableBlock(48, 96, stride=2)
        self.block5 = DepthwiseSeparableBlock(96, 144, stride=1)

        # Head
        self.gap = nn.AdaptiveAvgPool2d((1, 1))
        self.fc1 = nn.Linear(144, 256, bias=True)
        self.fc1_relu = nn.ReLU(inplace=True)
        self.dropout = nn.Dropout(p=0.2)
        self.fc2 = nn.Linear(256, num_classes, bias=True)

    def forward(self, x):
        x = self.stem_relu(self.stem_bn(self.stem_conv(x)))
        x = self.block1(x)
        x = self.block2(x)
        x = self.block3(x)
        x = self.block4(x)
        x = self.block5(x)
        x = self.gap(x).flatten(1)
        x = self.dropout(self.fc1_relu(self.fc1(x)))
        x = self.fc2(x)
        return x

# -------------------------------------------------------------
# 3. Export Weights to TF.js weights.bin
# -------------------------------------------------------------
def export_to_tfjs(model: MobileNetV3SmallTFJS, model_json_path: Path, output_bin_path: Path):
    """
    Serializes PyTorch model parameters into weights.bin strictly matching
    the name and shape ordering specified in model.json's weightsManifest.
    """
    with open(model_json_path, "r", encoding="utf-8") as f:
        meta = json.load(f)
    weight_specs = meta["weightsManifest"][0]["weights"]

    # Map TF.js tensor names to PyTorch parameter numpy arrays
    tensors = {}

    # Stem
    # PyTorch: [out, in, h, w] -> TF.js: [h, w, in, out]
    tensors["conv2d_Conv2D1/kernel"] = model.stem_conv.weight.detach().permute(2, 3, 1, 0).cpu().numpy().astype(np.float32)
    tensors["conv2d_Conv2D1/bias"] = model.stem_conv.bias.detach().cpu().numpy().astype(np.float32)
    tensors["batch_normalization_BatchNormalization1/gamma"] = model.stem_bn.weight.detach().cpu().numpy().astype(np.float32)
    tensors["batch_normalization_BatchNormalization1/beta"] = model.stem_bn.bias.detach().cpu().numpy().astype(np.float32)
    tensors["batch_normalization_BatchNormalization1/moving_mean"] = model.stem_bn.running_mean.detach().cpu().numpy().astype(np.float32)
    tensors["batch_normalization_BatchNormalization1/moving_variance"] = model.stem_bn.running_var.detach().cpu().numpy().astype(np.float32)

    # Blocks 1 to 5
    blocks = [model.block1, model.block2, model.block3, model.block4, model.block5]
    for i, b in enumerate(blocks, start=1):
        bn_idx = i + 1
        # Depthwise: PyTorch [in, 1, h, w] -> TF.js [h, w, in, 1]
        tensors[f"separable_conv2d_SeparableConv2D{i}/depthwise_kernel"] = b.depthwise.weight.detach().permute(2, 3, 0, 1).cpu().numpy().astype(np.float32)
        # Pointwise: PyTorch [out, in, 1, 1] -> TF.js [1, 1, in, out]
        tensors[f"separable_conv2d_SeparableConv2D{i}/pointwise_kernel"] = b.pointwise.weight.detach().permute(2, 3, 1, 0).cpu().numpy().astype(np.float32)
        tensors[f"separable_conv2d_SeparableConv2D{i}/bias"] = b.pointwise.bias.detach().cpu().numpy().astype(np.float32)
        # BN
        tensors[f"batch_normalization_BatchNormalization{bn_idx}/gamma"] = b.bn.weight.detach().cpu().numpy().astype(np.float32)
        tensors[f"batch_normalization_BatchNormalization{bn_idx}/beta"] = b.bn.bias.detach().cpu().numpy().astype(np.float32)
        tensors[f"batch_normalization_BatchNormalization{bn_idx}/moving_mean"] = b.bn.running_mean.detach().cpu().numpy().astype(np.float32)
        tensors[f"batch_normalization_BatchNormalization{bn_idx}/moving_variance"] = b.bn.running_var.detach().cpu().numpy().astype(np.float32)

    # Dense layers
    # Linear: PyTorch [out, in] -> TF.js [in, out]
    tensors["dense_Dense1/kernel"] = model.fc1.weight.detach().t().cpu().numpy().astype(np.float32)
    tensors["dense_Dense1/bias"] = model.fc1.bias.detach().cpu().numpy().astype(np.float32)
    tensors["dense_Dense2/kernel"] = model.fc2.weight.detach().t().cpu().numpy().astype(np.float32)
    tensors["dense_Dense2/bias"] = model.fc2.bias.detach().cpu().numpy().astype(np.float32)

    # Write binary stream according to weight_specs order
    output_bin_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_bin_path, "wb") as f_out:
        for spec in weight_specs:
            name = spec["name"]
            expected_shape = list(spec["shape"])
            if name not in tensors:
                raise KeyError(f"Missing weight tensor: {name}")
            arr = tensors[name]
            if list(arr.shape) != expected_shape:
                raise ValueError(f"Shape mismatch for {name}: got {list(arr.shape)}, expected {expected_shape}")
            f_out.write(arr.tobytes())

    print(f"Successfully exported TF.js weights: {output_bin_path} ({output_bin_path.stat().st_size / 1024:.1f} KB)")

# -------------------------------------------------------------
# 4. Training Loop
# -------------------------------------------------------------
def train_model(epochs=5, batch_size=64, lr=0.001):
    print("=======================================================")
    print("PlantVillage Multi-Crop Training (High-Accuracy PyTorch)")
    print("=======================================================")

    with open(LABELS_FILE, "r", encoding="utf-8") as f:
        labels_data = json.load(f)
    class_to_idx = labels_data["classToIndex"]
    num_classes = labels_data["totalClasses"]

    train_ds = PlantVillageDataset(DATA_SPLITS_DIR / "train.csv", class_to_idx, is_train=True)
    val_ds = PlantVillageDataset(DATA_SPLITS_DIR / "validation.csv", class_to_idx, is_train=False)

    print(f"Dataset Loaded: {len(train_ds)} train samples, {len(val_ds)} validation samples across {num_classes} classes.")

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    device = torch.device("cpu")
    model = MobileNetV3SmallTFJS(num_classes=num_classes).to(device)
    print(f"Model Parameters: {sum(p.numel() for p in model.parameters()):,}")

    criterion = nn.CrossEntropyLoss(label_smoothing=0.05)
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    history = {"loss": [], "accuracy": [], "val_loss": [], "val_accuracy": []}
    best_val_acc = 0.0

    t_start = time.time()

    for epoch in range(1, epochs + 1):
        t_ep0 = time.time()
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for batch_idx, (imgs, labels) in enumerate(train_loader, start=1):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item() * imgs.size(0)
            preds = outputs.argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)

            if batch_idx % 50 == 0 or batch_idx == len(train_loader):
                batch_acc = 100.0 * correct / total
                batch_loss = running_loss / total
                print(f"  [Epoch {epoch} | Batch {batch_idx:3d}/{len(train_loader)}] Loss: {batch_loss:.4f} | Acc: {batch_acc:5.1f}%", flush=True)

        scheduler.step()
        train_loss = running_loss / total
        train_acc = correct / total

        # Validation
        model.eval()
        v_loss = 0.0
        v_correct = 0
        v_total = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                outputs = model(imgs)
                loss = criterion(outputs, labels)
                v_loss += loss.item() * imgs.size(0)
                preds = outputs.argmax(dim=1)
                v_correct += (preds == labels).sum().item()
                v_total += labels.size(0)

        val_loss = v_loss / v_total
        val_acc = v_correct / v_total
        ep_duration = time.time() - t_ep0

        history["loss"].append(train_loss)
        history["accuracy"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_accuracy"].append(val_acc)

        print(f"--> Epoch {epoch}/{epochs} complete in {ep_duration:.1f}s | Train Acc: {train_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}%\n", flush=True)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            # Save checkpoint
            torch.save(model.state_dict(), MODELS_DIR / "best_model.pt")

    total_time = time.time() - t_start
    print(f"\nTraining Complete in {total_time:.1f}s. Best Validation Accuracy: {best_val_acc*100:.1f}%")

    # Load best weights
    model.load_state_dict(torch.load(MODELS_DIR / "best_model.pt"))

    # Export to TF.js
    model_json_path = TFJS_DIR / "model.json"
    weights_bin_path = TFJS_DIR / "weights.bin"
    export_to_tfjs(model, model_json_path, weights_bin_path)

    # Save history report
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "history_M1.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "modelId": "M1",
            "parameters": sum(p.numel() for p in model.parameters()),
            "epochs": epochs,
            "totalTimeSec": round(total_time, 1),
            "bestValAcc": round(best_val_acc, 4),
            "history": history
        }, f, indent=2)

    return best_val_acc

if __name__ == "__main__":
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    train_model(epochs=epochs)
