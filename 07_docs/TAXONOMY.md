# Canonical Multi-Crop Label Taxonomy

## 1. Single Source of Truth
The canonical taxonomy for this repository is defined strictly in `01_data/class_registry.yaml` and compiled to JSON in `01_data/labels.json` and `03_app/src/config/labels.json`.

- **Total Classes**: 38
- **Total Crops**: 14
- **Naming Standard**: `<crop>__<condition>`

## 2. Complete Taxonomy Listing

| Index | Canonical Class ID | Crop | Display Name | Pathogen Type |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `apple__apple_scab` | Apple | Apple - Apple Scab | Fungal |
| 1 | `apple__black_rot` | Apple | Apple - Black Rot | Fungal |
| 2 | `apple__cedar_apple_rust` | Apple | Apple - Cedar Apple Rust | Fungal |
| 3 | `apple__healthy` | Apple | Apple - Healthy | Control |
| 4 | `bell_pepper__bacterial_spot` | Bell Pepper | Bell Pepper - Bacterial Spot | Bacterial |
| 5 | `bell_pepper__healthy` | Bell Pepper | Bell Pepper - Healthy | Control |
| 6 | `blueberry__healthy` | Blueberry | Blueberry - Healthy | Control |
| 7 | `cherry__healthy` | Cherry | Cherry - Healthy | Control |
| 8 | `cherry__powdery_mildew` | Cherry | Cherry - Powdery Mildew | Fungal |
| 9 | `corn__common_rust` | Corn | Corn - Common Rust | Fungal |
| 10 | `corn__gray_leaf_spot` | Corn | Corn - Gray Leaf Spot | Fungal |
| 11 | `corn__healthy` | Corn | Corn - Healthy | Control |
| 12 | `corn__northern_leaf_blight` | Corn | Corn - Northern Leaf Blight | Fungal |
| 13 | `grape__black_rot` | Grape | Grape - Black Rot | Fungal |
| 14 | `grape__esca` | Grape | Grape - Esca (Black Measles) | Fungal |
| 15 | `grape__healthy` | Grape | Grape - Healthy | Control |
| 16 | `grape__leaf_blight_isariopsis` | Grape | Grape - Leaf Blight (Isariopsis) | Fungal |
| 17 | `orange__citrus_greening` | Orange | Orange - Citrus Greening | Bacterial |
| 18 | `peach__bacterial_spot` | Peach | Peach - Bacterial Spot | Bacterial |
| 19 | `peach__healthy` | Peach | Peach - Healthy | Control |
| 20 | `potato__early_blight` | Potato | Potato - Early Blight | Fungal |
| 21 | `potato__healthy` | Potato | Potato - Healthy | Control |
| 22 | `potato__late_blight` | Potato | Potato - Late Blight | Oomycete / Fungal |
| 23 | `raspberry__healthy` | Raspberry | Raspberry - Healthy | Control |
| 24 | `soybean__healthy` | Soybean | Soybean - Healthy | Control |
| 25 | `squash__powdery_mildew` | Squash | Squash - Powdery Mildew | Fungal |
| 26 | `strawberry__healthy` | Strawberry | Strawberry - Healthy | Control |
| 27 | `strawberry__leaf_scorch` | Strawberry | Strawberry - Leaf Scorch | Fungal |
| 28 | `tomato__bacterial_spot` | Tomato | Tomato - Bacterial Spot | Bacterial |
| 29 | `tomato__early_blight` | Tomato | Tomato - Early Blight | Fungal |
| 30 | `tomato__healthy` | Tomato | Tomato - Healthy | Control |
| 31 | `tomato__late_blight` | Tomato | Tomato - Late Blight | Oomycete / Fungal |
| 32 | `tomato__leaf_mold` | Tomato | Tomato - Leaf Mold | Fungal |
| 33 | `tomato__mosaic_virus` | Tomato | Tomato - Mosaic Virus | Viral |
| 34 | `tomato__septoria_leaf_spot` | Tomato | Tomato - Septoria Leaf Spot | Fungal |
| 35 | `tomato__target_spot` | Tomato | Tomato - Target Spot | Fungal |
| 36 | `tomato__two_spotted_spider_mite` | Tomato | Tomato - Two-Spotted Spider Mite | Mite / Pest |
| 37 | `tomato__yellow_leaf_curl_virus` | Tomato | Tomato - Yellow Leaf Curl Virus | Viral |
