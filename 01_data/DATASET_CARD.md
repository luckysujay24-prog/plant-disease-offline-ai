# Multi-Crop Plant Disease Benchmark Dataset Card (CR-02 Single Unified Benchmark)

> **Taxonomy Version**: 1.0.0  
> **Total Unified Classes**: 38  
> **Total Supported Crops**: 14  
> **Benchmark Dataset**: PlantVillage (Color Benchmark)  
> **Total Clean Images**: 55,110  
> **Total Unique Clusters**: 53,962  
> **Exact Duplicates Removed**: 19  
> **Splits Protocol**: 70% Train (38,661 images), 15% Validation (8,198 images), 15% Test (8,251 images)

---

## 1. Dataset Overview

### 1.1 PlantVillage Benchmark
- **Original Citation**: Hughes, D., & Salathé, M. (2015). *An open access repository of images on plant health to enable the development of mobile disease diagnostics.* arXiv preprint arXiv:1511.08060.
- **Journal Publication**: Mohanty, S. P., Hughes, D. P., & Salathé, M. (2016). *Using deep learning for image-based plant disease detection.* Frontiers in Plant Science, 7, 1419. [DOI: 10.3389/fpls.2016.01419](https://doi.org/10.3389/fpls.2016.01419).
- **Domain**: Laboratory / Controlled conditions (uniform background panels, standard lighting).
- **Scope**: 14 crop species (Apple, Blueberry, Cherry, Corn, Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, Tomato) across 38 distinct conditions.
- **License**: Creative Commons Attribution 4.0 International (CC BY 4.0). Open access research benchmark.
- **Leakage Prevention**: Laboratory leaf series frequently contain multiple photographic views of the exact same physical leaf specimen. Mitigated via perceptual hash (pHash, 64-bit) Disjoint Set Union clustering (Hamming distance $\le 4$) prior to split assignment.

---

## 2. Canonical Label Registry (38 Unified Classes)

| Canonical Class ID | Crop | Condition Name | Botanical / Pathological Agent | Clean Image Count |
|---|---|---|---|---|
| `apple__apple_scab` | Apple | Apple scab | *Venturia inaequalis* | 656 |
| `apple__black_rot` | Apple | Black rot | *Botryosphaeria obtusa* | 647 |
| `apple__cedar_apple_rust` | Apple | Cedar apple rust | *Gymnosporangium juniperi-virginianae* | 301 |
| `apple__healthy` | Apple | Healthy | Asymptomatic foliage | 1,671 |
| `blueberry__healthy` | Blueberry | Healthy | Asymptomatic foliage | 1,528 |
| `cherry__healthy` | Cherry | Healthy | Asymptomatic foliage | 880 |
| `cherry__powdery_mildew` | Cherry | Powdery mildew | *Podosphaera clandestina* | 1,078 |
| `corn__gray_leaf_spot` | Corn | Gray leaf spot | *Cercospora zeae-maydis* | 539 |
| `corn__common_rust` | Corn | Common rust | *Puccinia sorghi* | 1,218 |
| `corn__northern_leaf_blight` | Corn | Northern leaf blight | *Setosphaeria turcica* | 1,011 |
| `corn__healthy` | Corn | Healthy | Asymptomatic foliage | 1,188 |
| `grape__black_rot` | Grape | Black rot | *Guignardia bidwellii* | 1,206 |
| `grape__esca` | Grape | Esca (Black Measles) | Esca complex (*Phaeomoniella*, *Phaeoacremonium*) | 1,409 |
| `grape__healthy` | Grape | Healthy | Asymptomatic foliage | 449 |
| `grape__leaf_blight_isariopsis` | Grape | Leaf blight | *Pseudocercospora cladosporioides* | 1,102 |
| `orange__citrus_greening` | Orange | Citrus greening | *Candidatus Liberibacter asiaticus* | 5,533 |
| `peach__bacterial_spot` | Peach | Bacterial spot | *Xanthomonas arboricola pv. pruni* | 2,323 |
| `peach__healthy` | Peach | Healthy | Asymptomatic foliage | 386 |
| `bell_pepper__bacterial_spot` | Pepper | Bacterial spot | *Xanthomonas campestris pv. vesicatoria* | 1,023 |
| `bell_pepper__healthy` | Pepper | Healthy | Asymptomatic foliage | 1,504 |
| `potato__early_blight` | Potato | Early blight | *Alternaria solani* | 1,026 |
| `potato__healthy` | Potato | Healthy | Asymptomatic foliage | 178 |
| `potato__late_blight` | Potato | Late blight | *Phytophthora infestans* | 1,026 |
| `raspberry__healthy` | Raspberry | Healthy | Asymptomatic foliage | 397 |
| `soybean__healthy` | Soybean | Healthy | Asymptomatic foliage | 5,116 |
| `squash__powdery_mildew` | Squash | Powdery mildew | *Podosphaera xanthii* | 1,861 |
| `strawberry__healthy` | Strawberry | Healthy | Asymptomatic foliage | 482 |
| `strawberry__leaf_scorch` | Strawberry | Leaf scorch | *Diplocarpon earlianum* | 1,135 |
| `tomato__bacterial_spot` | Tomato | Bacterial spot | *Xanthomonas* spp. | 2,153 |
| `tomato__early_blight` | Tomato | Early blight | *Alternaria solani* | 1,026 |
| `tomato__healthy` | Tomato | Healthy | Asymptomatic foliage | 1,453 |
| `tomato__late_blight` | Tomato | Late blight | *Phytophthora infestans* | 1,935 |
| `tomato__leaf_mold` | Tomato | Leaf mold | *Passalora fulva* | 978 |
| `tomato__septoria_leaf_spot` | Tomato | Septoria leaf spot | *Septoria lycopersici* | 1,797 |
| `tomato__two_spotted_spider_mite` | Tomato | Two-spotted spider mite | *Tetranychus urticae* | 1,702 |
| `tomato__target_spot` | Tomato | Target spot | *Corynespora cassiicola* | 1,430 |
| `tomato__mosaic_virus` | Tomato | Mosaic virus | Tomato mosaic virus (ToMV) | 399 |
| `tomato__yellow_leaf_curl_virus` | Tomato | Yellow leaf curl virus | Tomato yellow leaf curl virus (TYLCV) | 5,383 |

---

## 3. Data Split & Leakage Protocol

1. **Exact File Deduplication**: SHA-256 digests verified across all images; 19 exact byte duplicates were eliminated.
2. **Perceptual Hashing & Clustering**: Perceptual hashing (pHash, 64-bit) identified 1,604 near-duplicate image pairs with Hamming distance $\le 4$. All clustered into 53,962 indivisible clusters.
3. **Cluster-Constrained Stratified Splitting**: Clusters were partitioned 70% / 15% / 15% using stratified cluster allocation:
   - **Training partition**: 38,661 images
   - **Validation partition**: 8,198 images
   - **Test partition**: 8,251 images
4. **Leakage Verification**: Enforced and proven via `02_ml/tests/test_no_leakage.py` (4 of 4 pytest assertions passed). Zero path overlap and zero cluster overlap across all partitions.
