# AWS Cloud Layer Deployment & Console Guide

> **IMPORTANT NOTICE: ZERO-COST AND OFFLINE GUARANTEES**
> 1. The core diagnosis workflow is **strictly offline-first**. AWS is an optional backup layer and is **never required or called** during in-field disease identification.
> 2. All architecture components (Cognito, HTTP API Gateway, Lambda ARM64, DynamoDB On-Demand, S3) are configured to operate **100% within the AWS Free Tier**.
> 3. **Never share, store, or commit AWS root credentials or API secret keys.**

---

## 1. Setting Up Free Tier & Cost Guardrails ($0 Budget Alert)

Before deploying any cloud resources, set up a zero-dollar budget alert in AWS Budgets:

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **AWS Budgets** and select it.
3. Click **Create budget**.
4. Select **Zero spend budget** (or Cost budget with an amount of **$1.00**).
5. Enter your email address under **Recipient email addresses**.
6. Click **Create budget**.
   - *Result*: AWS will immediately email you if any charge exceeding $0.01 is incurred.

---

## 2. Setting Up an IAM Deployment User

**Never use your AWS Root user for CLI deployment.**

1. Navigate to **IAM** (Identity and Access Management) in the AWS Console.
2. Click **Users** → **Create user**.
3. Set User name: `crop-health-deployer`.
4. Check **Provide user access to the AWS Management Console** only if needed.
5. In **Permissions options**, select **Attach policies directly**:
   - Attach `AdministratorAccess` (or custom scoped policy for CloudFormation, Lambda, API Gateway, DynamoDB, S3, Cognito).
6. Click **Next** → **Create user**.
7. Click into the newly created user → **Security credentials** tab → **Create access key**.
8. Select **Command Line Interface (CLI)**, acknowledge guidance, and download the `.csv` file.
9. In your local terminal, run:
   ```bash
   aws configure
   ```
   Enter the Access Key ID, Secret Access Key, default region (e.g., `ap-south-1` for Mumbai or `us-east-1`), and output format `json`.

---

## 3. Automated Deployment via AWS SAM CLI

The infrastructure is fully defined as code in [`04_cloud/infra/template.yaml`](../infra/template.yaml).

### Step 3.1: Build Serverless Artifacts
From the repository root:
```bash
# Windows PowerShell
cd 04_cloud/infra
sam build

# macOS / Linux
cd 04_cloud/infra && sam build
```

### Step 3.2: Deploy Serverless Stack
```bash
sam deploy --guided
```
When prompted by SAM CLI, enter:
- **Stack Name**: `plant-disease-cloud-stack`
- **AWS Region**: `ap-south-1` (or your preferred region)
- **Confirm changes before deploy**: `Y`
- **Allow SAM CLI to create IAM roles**: `Y`
- **Disable rollback**: `N`
- **Save arguments to configuration file (samconfig.toml)**: `Y`

SAM will provision:
- Amazon Cognito User Pool & App Client
- HTTP API Gateway with JWT Authorizer
- 4 Serverless Lambda functions (`nodejs20.x` on ARM64 Graviton)
- Amazon DynamoDB table (`PlantScans` with Pay-Per-Request billing)
- Amazon S3 bucket (`crop-health-images-...`) with Server-Side AES-256 encryption and public access blocks.

---

## 4. Connecting the Progressive Web App (PWA)

After SAM deployment completes, it prints the CloudFormation Outputs in your terminal:
- `HttpApiUrl` (e.g., `https://abcdef123.execute-api.ap-south-1.amazonaws.com`)
- `UserPoolId` (e.g., `ap-south-1_abcdef123`)
- `UserPoolClientId` (e.g., `1234567890abcdef`)

1. Open `03_app/.env` (or create from `03_app/.env.example`):
   ```env
   VITE_API_BASE_URL=https://abcdef123.execute-api.ap-south-1.amazonaws.com
   VITE_COGNITO_USER_POOL_ID=ap-south-1_abcdef123
   VITE_COGNITO_CLIENT_ID=1234567890abcdef
   ```
2. Re-build the app:
   ```bash
   cd 03_app
   npm run build
   ```

---

## 5. Testing Without AWS (Zero-Cost Local Mock Server)

If you do not have an AWS account or prefer not to deploy to AWS, use the built-in mock server:
```bash
# Start local mock cloud API
node 04_cloud/mock-server/server.js
```
The mock server runs on `http://localhost:4000`, simulates DynamoDB idempotency, mock S3 presigned PUTs, and fault injection without requiring AWS credentials.

---

## 6. Stack Teardown & Resource Deletion

To ensure zero lingering resources after testing or grading:

```bash
cd 04_cloud/infra
sam delete --stack-name plant-disease-cloud-stack
```

1. If the S3 bucket contains uploaded scan images, empty the bucket in the S3 console before deletion:
   - S3 Console → Select `crop-health-images-...` → Click **Empty** → Type `permanently delete`.
2. Confirm stack deletion in CloudFormation. All services will be removed immediately.
