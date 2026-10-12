# Deployment & Operations Guide

## 1. Local Development (PWA Frontend)

1. **Install Dependencies**:
   ```bash
   cd 03_app
   npm install
   ```
2. **Start Vite Dev Server**:
   ```bash
   npm run dev
   ```
3. **Build Production PWA**:
   ```bash
   npm run build
   ```
4. **Preview Production Build Locally (Network / Mobile Testing)**:
   ```bash
   npm run preview -- --host
   ```
   Open the printed IP URL on your mobile phone connected to the same Wi-Fi. Follow the prompts in `05_experiments/manual_tests/PHONE_TEST_SHEET.md` to install the PWA and test in Airplane Mode.

---

## 2. Serverless Cloud Backend Deployment (AWS SAM)

Detailed instructions with zero-dollar budget guardrails are documented in [`04_cloud/docs/AWS_CONSOLE_GUIDE.md`](../04_cloud/docs/AWS_CONSOLE_GUIDE.md).

Quick summary:
```bash
cd 04_cloud/infra
sam build
sam deploy --guided
```

Outputs provide `HttpApiUrl`, `UserPoolId`, and `UserPoolClientId` to paste into `03_app/.env`.

---

## 3. Teardown / Destruction

To avoid accidental charges when testing is complete:
```bash
cd 04_cloud/infra
sam delete --stack-name plant-disease-cloud-stack
```
