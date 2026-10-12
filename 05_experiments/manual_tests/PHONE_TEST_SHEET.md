# Physical Smartphone Verification Protocol & Test Sheet

> **STATUS: PENDING HUMAN TEST**
>
> In accordance with the **Strict Truthfulness Contract (Section 0.3)**, automated coding assistants cannot physically manipulate a handheld hardware smartphone. This document provides the explicit test matrix and acceptance steps that the human evaluator must execute on a physical Android and/or iOS device.

---

## 1. Test Device Prerequisites

- **Device**: Android (Chrome v110+) or iOS (Safari 16.4+ / Chrome)
- **Local Access**: Host `03_app` using `npm run preview -- --host` on your local development machine, or deploy the static build to a staging host (e.g. GitHub Pages / Vercel / AWS S3 + CloudFront).
- **Network**: Local Wi-Fi connection initially for PWA asset pre-caching.

---

## 2. Test Execution Matrix

| Step | Test Case | Action | Expected Outcome | Human Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | **Service Worker Install & Precache** | Open the PWA URL in mobile browser. Wait for the green status banner: *"AI ready on this device"*. Tap browser menu → **Add to Home screen** / **Install App**. | App installs to home screen. Service worker precaches 11 core bundles + model shards (`model.json`, `weights.bin`). | `[ ] PASS / [ ] FAIL` |
| **T2** | **Airplane Mode Transition** | Close browser. Enable **Airplane Mode** (Wi-Fi: OFF, Mobile Data: OFF). Launch the installed app icon from the home screen. | App opens instantly from cache. Status banner indicates: *"Offline — core features available | AI ready on this device"*. | `[ ] PASS / [ ] FAIL` |
| **T3** | **Crop Selection** | Tap **Detect Disease**. Select a crop (e.g., Tomato). | Page transitions smoothly to camera interface without error or network hang. | `[ ] PASS / [ ] FAIL` |
| **T4** | **Camera Capture & Downscaling** | Tap **Tap to Take Photo**. Point phone camera at a leaf. Capture photo. | Photo is downscaled on-device to max 640px. Thumbnail preview renders immediately. | `[ ] PASS / [ ] FAIL` |
| **T5** | **Edge AI Inference (Zero Network)** | Tap **Check Leaf**. Verify no data transmission occurs. | AI finishes in under 200 ms. Top predicted condition and confidence are displayed. | `[ ] PASS / [ ] FAIL` |
| **T6** | **Honest Weather Fallback** | Inspect the **Environmental Disease Risk** card on the Result screen. | Source label displays: *"Seasonal Normal ([District], Oct fallback)"*. No failed network spinner is shown. | `[ ] PASS / [ ] FAIL` |
| **T7** | **Offline Persistence** | Navigate to **My Results** (History). Close the app completely and reopen in Airplane Mode. | Scanned diagnosis with thumbnail, confidence, and timestamp is persisted in IndexedDB. Status shows *"Saved on this device"*. | `[ ] PASS / [ ] FAIL` |
| **T8** | **Online Reconnection & Sync** | Turn Airplane Mode OFF. Reconnect to Wi-Fi. Open **Settings & Cloud** → Enable Cloud Backup → Tap **Sync Now**. | Queued scans synchronize to cloud backend without duplicates. Sync status updates to *"Synced"*. | `[ ] PASS / [ ] FAIL` |
| **T9** | **High-Res Gallery Photo (12 MP – 48 MP)** | Tap **Choose from Gallery**. Select an uncompressed full-resolution phone camera photo (12 MP – 48 MP, 5–15 MB). | Stepwise halving downsamples safely on-device in under 200 ms without browser crash or out-of-memory error. | `[ ] PASS / [ ] FAIL` |
| **T10** | **Forwarded Compressed Image (WhatsApp)** | Choose a heavily compressed photo saved from WhatsApp or web (under 50 KB). | Image is decoded, analyzed honestly; confidence and condition displayed without synthetic crash. | `[ ] PASS / [ ] FAIL` |
| **T11** | **Dark / Blurry Photo Quality Warning** | Take photo in dim lighting or shake camera to induce blur. | Quality analyzer detects low luminance / high blur and renders advisory hint: *"Photo is blurry/dark — results may be less reliable"*. | `[ ] PASS / [ ] FAIL` |
| **T12** | **Non-Leaf Photo Rejection Gate** | Photograph an everyday non-plant object (e.g., shoe, keyboard, tabletop). | Excess Green (ExG) index check triggers: *"No plant leaf detected. Please take a clear photo of a single leaf."* Model does not invent a disease. | `[ ] PASS / [ ] FAIL` |
| **T13** | **Nutrition & Care Advisory Timing** | Examine the **What to Do & When** card on the Result page after diagnosis. | Non-blocking advisory displays action headline, 7-day soil/foliar status strip, and literature citations. Zero chemical brand names or fabricated doses appear. | `[ ] PASS / [ ] FAIL` |

---

## 3. Human Sign-Off Sheet

- **Tester Name**: ___________________________
- **Device Model & OS**: ___________________________ (e.g., Samsung Galaxy S22, Android 14 / iPhone 13, iOS 17.4)
- **Browser & Version**: ___________________________
- **Date Tested**: ___________________________
- **Notes / Observations**: ____________________________________________________________________
