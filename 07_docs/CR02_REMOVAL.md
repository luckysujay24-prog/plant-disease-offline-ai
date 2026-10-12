# CR-02 Architecture Refactor: Clean Removal of Weather and Agronomic Risk Engines

**Document**: `07_docs/CR02_REMOVAL.md`  
**Date**: October 11, 2026  
**Status**: COMPLETED & VERIFIED  
**Authors**: D. Sujay (24BRS1027), V. L. Dharma Teja (24BRS1196), K. Dhileep (24BRS1389)  

---

## 1. Rationale & Objectives

Under **Change Request CR-02**, the user explicitly directed the complete removal of external weather feeds, weather-aware risk scoring, and forecast spray timing. In real-world edge deployments:
1. Farmers photograph leaves in remote offline fields where live weather APIs fail or introduce latency.
2. The primary user demand is immediate, reliable disease screening and verified, actionable care and nutrition guidance directly on the phone.
3. Decoupling weather simplifies system architecture, decreases memory footprint, eliminates external API failure modes, and focuses resources entirely on high-accuracy computer vision classification across the full PlantVillage dataset.

---

## 2. Inventory of Deleted Files and Modules

| Component / File Path | Purpose Prior to Removal | Status |
| :--- | :--- | :--- |
| `03_app/src/weather/weatherService.js` | Open-Meteo HTTP fetching & weather cache | **DELETED** |
| `03_app/src/weather/weatherProvider.js` | Live vs offline weather resolution | **DELETED** |
| `03_app/src/weather/riskEngine.js` | Formulaic risk score calculation | **DELETED** |
| `03_app/src/weather/forecast.js` | 7-day forecast processing & spray window evaluation | **DELETED** |
| `03_app/src/weather/seasonal_profile.json` | 30-year seasonal climate normals (Nashik/Guntur/etc.) | **DELETED** |
| `03_app/src/advisor/ruleEngine.js` | CR-01 Rule engine for fertilizer and weather timing | **DELETED** |
| `03_app/src/components/RiskBadge.jsx` | UI badge for LOW/MEDIUM/HIGH risk category | **DELETED** |
| `03_app/src/pages/CropWeather.jsx` | Weather snapshot and risk overview screen | **DELETED** |
| `03_app/src/config/advisor-config.json` | Fertilizer spray window parameters | **DELETED** |
| `03_app/src/config/application_rules.json`| Application timing rules | **DELETED** |
| `03_app/src/config/fertilizer_knowledge.json`| Obsolete fertilizer knowledge store | **DELETED** |
| `03_app/src/config/risk-config.json` | Weather risk thresholds and weights | **DELETED** |
| `03_app/src/config/disease_knowledge.json` | Legacy disease pathogen matrix | **DELETED** |
| `03_app/src/config/advice.json` | Generic fallback advice text | **DELETED** |
| `03_app/tests/forecast.test.js` | Vitest test suite for forecast parsing | **DELETED** |
| `03_app/tests/riskEngine.test.js` | Vitest test suite for risk engine | **DELETED** |
| `03_app/tests/advisor_rules.test.js` | Vitest test suite for advisor rules | **DELETED** |

**Net Code Reduction**: Over 1,800 lines of obsolete logic, config, and tests cleanly purged.

---

## 3. Database Migration & Backward Compatibility Proof

### IndexedDB Version Bump: `DB_VERSION = 3`
In `03_app/src/offline/db.js`:
```javascript
// CR-02 Migration: Cleanly delete legacy weatherCache & forecastCache stores
if (db.objectStoreNames.contains('weatherCache')) {
  db.deleteObjectStore('weatherCache');
}
if (db.objectStoreNames.contains('forecastCache')) {
  db.deleteObjectStore('forecastCache');
}
```

### Legacy Scan Compatibility
- Old scans recorded in v1.0.0 and v1.1.0 contain `weatherSnapshot` and `risk` objects.
- In `03_app/src/pages/Result.jsx` and `History.jsx`, records are rendered without demanding weather fields.
- Cloud schema (`04_cloud/infra/scan-schema.json`) was updated to mark `weatherSnapshot` and `risk` as optional properties.
- Automated contract test in `04_cloud/mock-server/test_sync.js` verifies that:
  - Legacy v1.0.0 scans (with weather) pass ingestion with HTTP 201.
  - Legacy v1.1.0 scans (with advisory) pass ingestion with HTTP 201.
  - Pure CR-02 vision scans (without weather) pass ingestion with HTTP 201.

---

## 4. Source Tree Grep Verification

We performed a recursive grep across `03_app/src/` for all disallowed terms (`weather`, `forecast`, `openmeteo`, `riskEngine`, `RiskBadge`):
```powershell
Select-String -Path "03_app/src/**/*.*" -Pattern "weather|forecast|openmeteo|riskEngine|RiskBadge"
```
**Results**:
- Zero imports or functional references to weather or forecast.
- Two matches in `care_knowledge.json` corresponding exclusively to standard agronomic sentences:
  - *"Prune during dry summer weather to minimize silver leaf..."*
  - *"Spray underside of leaves with strong streams of water during hot, dry weather..."*
- Zero matches in UI components or services.

---

## 5. UI Architecture: Crop Care Screen

The obsolete "Crop & Weather" tile on the home screen was replaced with **Crop Care**:

```
+-----------------------------------------------------------+
|                   Crop Health AI   [Online/Offline]       |
+-----------------------------------------------------------+
|                                                           |
|  [🔍 Detect Disease]                                      |
|     Photograph leaf for instant offline diagnosis         |
|                                                           |
|  [🌿 Crop Care]                                           |
|     Evidence-based care guides and preventive nutrition   |
|                                                           |
|  [📋 My Results]                                          |
|     Review previous scans saved on this device            |
|                                                           |
|  [⚙️ Settings & Cloud]                                    |
|     Language, offline storage, and AWS backup options     |
|                                                           |
+-----------------------------------------------------------+
```

### Crop Care Screen Layout
```
+-----------------------------------------------------------+
| Crop Care & Nutrition Guide                              |
+-----------------------------------------------------------+
| SELECT CROP: [ Tomato                              ▼ ]    |
| [ Search Tomato conditions...                  🔍 ]       |
+-----------------------------------------------------------+
| [ Tomato - Early Blight (Alternaria solani)  | Pathology] |
|                                                           |
| Alternaria solani is a fungal foliar pathogen causing     |
| concentric target-board lesions on older leaves.          |
|                                                           |
| 🌾 Cultural Practices:                                    |
|   • Remove and burn or bury infected lower leaves.        |
|   • Mulch base of plants with straw to prevent soil splash|
|   • Drip irrigate early in the morning.                   |
|                                                           |
| 🌱 Nutrition & Soil Focus:                                |
|   Moderate nitrogen; ensure adequate potassium & calcium. |
|   Suggested sources: Compost, Potassium sulfate, Bone meal|
|                                                           |
| ⚠️ Caution: High nitrogen creates dense, soft foliage that |
|    delays drying and accelerates fungal spore penetration.|
|                                                           |
| 📖 Reference: UC IPM (2021). Tomato Early Blight.         |
| ℹ️ Non-curative guidance. Consult extension for outbreaks. |
+-----------------------------------------------------------+
```
