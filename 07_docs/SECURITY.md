# Security & Privacy Policy

## 1. Zero Secrets in Source Control
- No AWS access keys, secret keys, or database passwords are ever committed to this repository.
- Sensitive environment variables are configured via `.env` (gitignored). `.env.example` provides template keys with empty values.

## 2. Least-Privilege Cloud IAM Roles
- The AWS SAM template (`04_cloud/infra/template.yaml`) adheres strictly to least privilege:
  - `CreateScanFunction` has only `DynamoDBCrudPolicy` scoped to the `PlantScans` table.
  - `GetUploadUrlFunction` has only `S3WritePolicy` scoped to the `PlantScanImagesBucket`.
  - `ListScansFunction` has only `DynamoDBReadPolicy`.

## 3. Storage & Transport Security
- **In-Transit**: All communications with API Gateway and S3 require TLS 1.2+ encryption (HTTPS).
- **At-Rest**: S3 images are automatically encrypted using Server-Side AES-256 (`SSEAlgorithm: AES256`). Public access is blocked via `BlockPublicAcls: true` and `RestrictPublicBuckets: true`.
- **Cognito JWT**: All mutating cloud endpoints require a valid JWT issued by Amazon Cognito.

## 4. Farmer Privacy & On-Device Processing
- Leaf photographs are processed entirely in the user's browser via client-side TensorFlow.js.
- Images never leave the device unless the user explicitly enables **Cloud Backup** and **Include leaf photos** in the Settings screen.
- Diagnosis works without telemetry or third-party tracking.
