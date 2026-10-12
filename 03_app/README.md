# Farmer-Facing Progressive Web App (PWA)

An offline-first, installable Progressive Web Application built with React, Vite, and Workbox.

## Key Features
- **Offline-First AI Diagnosis**: Runs on-device multi-crop inference via `@tensorflow/tfjs` entirely inside the client browser.
- **Resilient Offline Cache**: Pre-cached app shell and neural network weights via Service Worker.
- **Local Persistence**: Client storage powered by IndexedDB (`cropHealthDB`) with support for offline queueing (`scans`, `images`, `weatherCache`, `settings`).
- **Weather-Aware Risk Engine**: Evaluates disease severity against live Open-Meteo forecasts, cached records, or validated seasonal fallback profiles.
- **Non-Blocking Cloud Sync**: Background synchronization with optional AWS backend or local mock server.
