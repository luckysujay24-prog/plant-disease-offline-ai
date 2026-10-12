# Cloud Integration Layer (AWS & Local Mock Server)

This directory contains the optional, non-blocking cloud synchronization infrastructure.

## Components
- `infra/template.yaml`: AWS SAM (Serverless Application Model) infrastructure definition.
- `lambdas/`: Serverless functions (health, create-scan, get-upload-url, list-scans).
- `mock-server/`: Node.js Express mock API server for local end-to-end sync testing without cloud dependencies.
- `scripts/`: Code-generation scripts syncing database schemas and API request validators with `labels.json`.
- `docs/AWS_CONSOLE_GUIDE.md`: Step-by-step console guide for deployment, cost safety, and cleanup.
