import json
from pathlib import Path
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = REPO_ROOT / "02_ml" / "data"

# Save 20 samples to separate npy
test_x = np.load(DATA_DIR / "test_x.npy")[:20]
test_y = np.load(DATA_DIR / "test_y.npy")[:20]

np.save("07_docs/scripts/parity_20_x.npy", test_x)
np.save("07_docs/scripts/parity_20_y.npy", test_y)
print(f"Saved 20 samples with shape {test_x.shape}")
