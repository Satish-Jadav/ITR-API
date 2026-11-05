# ZeroTax-Local API: Complete Production Deployment Guide

This guide provides end-to-end instructions for deploying the **ZeroTax-Local Node.js + TypeScript API** on **Vercel Serverless (`bom1` Mumbai)** with **Supabase (PostgreSQL 16 + Supabase Storage in `ap-south-1` Mumbai)** to achieve 100% compliance with CERT-In (2022), RBI Data Localization, and DPDP Act 2023.

---

## 1. Architecture Summary

- **API Runtime:** Node.js 22 LTS (Hono / Vercel Serverless Function) pinned to `bom1` (Mumbai).
- **Database:** Supabase PostgreSQL 16 (`ap-south-1` Mumbai) with Row Level Security (RLS) on all user data.
- **File Storage:** Supabase Storage (`ztvault-backups` and `ca-dossiers` buckets) storing opaque client-encrypted AES-256-GCM snapshots (`.ztvault`).
- **Security:** RFC 9449 DPoP hardware Keystore proof signing, Ed25519 (EdDSA) access tokens, Google Play Integrity verification, anti-replay timestamps (±30s), and strict Zod validation.

---

## 2. Step 1: Set Up Supabase Project (Mumbai `ap-south-1`)

1. Go to [https://supabase.com](https://supabase.com) and log in.
2. Click **New Project**:
   - **Name:** `zerotax-prod`
   - **Database Password:** Generate a strong 32+ character password.
   - **Region:** Select **`ap-south-1` (Mumbai, India)** (Mandatory for RBI & DPDP Act compliance).
   - **Pricing Plan:** Pro / Team (recommended for production RLS and daily automated backups).
3. Once the database provisions, get your **Database Connection Parameters**:
   - **Recommended (Individual Variables):** In the Connect modal $\rightarrow$ click **Direct** (or Settings ⚙ $\rightarrow$ Database) and note the individual fields:
     - `DB_HOST`: e.g. `aws-0-ap-south-1.pooler.supabase.com`
     - `DB_PORT`: `6543` (Transaction pooler)
     - `DB_NAME`: `postgres`
     - `DB_USER`: `postgres.[PROJECT_REF]`
     - `DB_PASSWORD`: Your database password
     *(Using separate variables prevents URL encoding issues with special characters in your password).*
   - **Alternative (Single URI):** Select **URI** $\rightarrow$ `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` into `DATABASE_URL`.

4. Find your **Project URL & API Keys**:
   - In the left sidebar, click **Settings** (⚙ gear icon) $\rightarrow$ Click **API** (or **API Keys** / **Data API**).
   - Copy **Project URL** (`https://[PROJECT_REF].supabase.co`).
   - Copy **anon public key** (`sb_publishable_...` or JWT).
   - Copy **service_role secret key** (Click "Reveal" to copy; keep this secret, only add to Vercel/server environment variables).

---

## 3. Step 2: Push Database Schema (via Drizzle ORM or SQL Editor)

### Option A: Direct Push via Drizzle ORM (Recommended - 100% Direct Postgres)
Because the API uses **Drizzle ORM** directly over PostgreSQL (port 6543 / 5432), you do not need Supabase Data APIs or PostgREST. Simply run:

```bash
npm run db:push
```
This automatically connects to your PostgreSQL database and provisions all 14 tables, indexes, and relations.

You can also launch Drizzle Studio to browse your tables locally:
```bash
npm run db:studio
```

### Option B: Via Supabase SQL Editor
1. In the Supabase Dashboard, click on **SQL Editor** in the left sidebar.
2. Click **New query**, paste the entire contents of [`supabase/migrations/20261105000000_zerotax_init.sql`](file:///d:/projects/ITR-API/supabase/migrations/20261105000000_zerotax_init.sql), and click **Run**.
3. Open another **New query**, paste the contents of [`supabase/seed/statutory_ay2026_27.sql`](file:///d:/projects/ITR-API/supabase/seed/statutory_ay2026_27.sql), and click **Run**.
   - This seeds the AY 2026-27 OTA rules bundle (CII 376, Section 87A rebate, standard deduction ₹75,000), SBI TTBR rates, Jan 31 2018 grandfathered equity FMVs, and RBI IFSC codes.

---

## 4. Step 3: Generate Server Cryptographic Keys

In your local terminal inside `d:\projects\ITR-API`, run:

```bash
npm run generate-keys
```

This generates:
- `ZEROTAX_ED25519_PRIVATE_KEY_PEM`: PKCS#8 private key for signing 15-minute Access JWTs.
- `ZEROTAX_ED25519_PUBLIC_KEY_PEM`: SPKI public key for validating Access JWTs.
- `ZEROTAX_OTA_SIGNING_PRIVATE_KEY_HEX`: 32-byte Ed25519 private key for signing statutory OTA rule bundles.
- `ZEROTAX_OTA_PUBLIC_KEY_HEX`: 32-byte public key bundled inside the Android APK.
- `ZEROTAX_PAN_BLIND_INDEX_PEPPER`: 64-character hex pepper for HMAC-SHA256 blind indexing of email and PAN.

---

## 5. Step 4: Configure Google Cloud & Play Integrity

1. **Google Cloud Console:**
   - Create a project or use your existing ZeroTax Play Console linked project.
   - Enable **Google Play Integrity API**.
   - Create a **Service Account** with the **Play Integrity Viewer** role.
   - Generate a JSON private key and minify it into a single line string for `GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON`.
2. **Google OAuth 2.0 Web Client ID:**
   - Under **APIs & Services** $\rightarrow$ **Credentials**, create an OAuth 2.0 Client ID (type: Web Application).
   - Set the Client ID to `GOOGLE_OAUTH_CLIENT_ID`.
   - The Android app's `CredentialManager` will use this Web Client ID as the server audience.

---

## 6. Step 5: Deploy to Vercel (`bom1` Mumbai)

### Option A: Via Vercel CLI

```bash
cd d:\projects\ITR-API
npm install -g vercel

# Link to Vercel account
vercel link

# Add environment variables
vercel env add DATABASE_URL production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_ANON_KEY production
vercel env add ZEROTAX_ED25519_PRIVATE_KEY_PEM production
vercel env add ZEROTAX_ED25519_PUBLIC_KEY_PEM production
vercel env add ZEROTAX_PAN_BLIND_INDEX_PEPPER production
vercel env add GOOGLE_PLAY_PACKAGE_NAME production # in.zerotax.app

# Deploy to production
vercel --prod
```

### Option B: Via GitHub Repository Import

1. Push `d:\projects\ITR-API` to a new GitHub repository (e.g. `github.com/your-org/zerotax-api`).
2. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard) and click **Add New... $\rightarrow$ Project**.
3. Import the repository.
4. **Build & Development Settings:**
   - Framework Preset: **Other**
   - Root Directory: `./`
5. **Environment Variables:** Add the following production variables:

| Variable Name | Description | Example / Note |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | Supabase pooled connection string | `postgresql://postgres.[REF]:[PASS]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require` |
| `SUPABASE_URL` | Supabase API endpoint | `https://[REF].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key for Supabase Storage | `eyJhbGciOiJI...` |
| `SUPABASE_ANON_KEY` | Public key | `eyJhbGciOiJI...` |
| `SUPABASE_VAULT_BUCKET` | Storage bucket for .ztvault | `ztvault-backups` |
| `SUPABASE_CA_BUCKET` | Storage bucket for CA review | `ca-dossiers` |
| `ZEROTAX_ED25519_PRIVATE_KEY_PEM` | Server JWT signing key | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----` |
| `ZEROTAX_ED25519_PUBLIC_KEY_PEM` | Server JWT public key | `-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----` |
| `ZEROTAX_PAN_BLIND_INDEX_PEPPER` | HMAC server pepper | 64-char hex string |
| `GOOGLE_PLAY_PACKAGE_NAME` | Android Package ID | `in.zerotax.app` |
| `ALLOW_PLAY_INTEGRITY_DEV_BYPASS`| Disable in production | `false` |
| `GEMINI_API_KEY` | Optional: Vertex AI / Gemini API key | `AIzaSy...` |

6. Click **Deploy**. Vercel will deploy the serverless functions strictly to region **`bom1` (Mumbai)** as dictated by [`vercel.json`](file:///d:/projects/ITR-API/vercel.json).

---

## 7. Step 6: Post-Deployment Verification

Verify your live production deployment using curl:

### 1. Health & Residency Check
```bash
curl -i https://<your-vercel-domain>.vercel.app/health
```
**Expected Response (`200 OK`):**
```json
{
  "status": "ONLINE",
  "service": "ZeroTax-Local Node.js API",
  "region": "bom1 (ap-south-1 Mumbai)",
  "compliance": "CERT-In / RBI / DPDP Act 2023",
  "version": "2026.1.0"
}
```

### 2. VAPT-12 Browser Origin Block Check
```bash
curl -i -H "Origin: https://google.com" https://<your-vercel-domain>.vercel.app/api/v1/statutory/manifest
```
**Expected Response:** `403 Forbidden` (`VAPT_12_BROWSER_ORIGIN_FORBIDDEN`).

### 3. VAPT-04 Anti-Replay Timestamp Skew Check
```bash
curl -i -H "X-ZeroTax-Timestamp: 1000" https://<your-vercel-domain>.vercel.app/api/v1/statutory/manifest
```
**Expected Response:** `401 Unauthorized` (`VAPT_04_TIMESTAMP_SKEW_OR_REPLAY`).

---

## 8. Summary of API Endpoints Ready for Android APK

| Endpoint | Method | Auth | Description |
| :--- | :---: | :---: | :--- |
| `/api/v1/auth/oauth/challenge` | POST | None | Step 1 of OAuth 2.1 PKCE + Play Integrity challenge |
| `/api/v1/auth/oauth/google-pkce` | POST | None | Step 2 of OAuth 2.1 exchange for Ed25519 JWT & DPoP refresh token |
| `/api/v1/auth/token/refresh` | POST | DPoP | Rotates refresh token within family; revokes family on reuse |
| `/api/v1/auth/dpdp-shred-account` | DELETE | DPoP | DPDP Sec 12(3) Right to Erasure; deletes Supabase storage & DB |
| `/api/v1/statutory/manifest` | GET | None | AY 2026-27 OTA rules bundle & Ed25519 signature |
| `/api/v1/statutory/sbi-ttbr` | GET | None | Rule 115 SBI TTBR rates for foreign assets |
| `/api/v1/statutory/isin-fmv-batch` | POST | None | Section 55(2)(ac) Jan 31 2018 FMV grandfathering lookup |
| `/api/v1/statutory/ifsc/:ifscCode` | GET | None | Bank IFSC lookup & EVC capability check |
| `/api/v1/vault/sync` | PUT | DPoP | Uploads encrypted `.ztvault` ciphertext to Supabase Storage |
| `/api/v1/vault/sync/:panHmac` | GET | DPoP | Restores encrypted `.ztvault` snapshot for new phone restore |
| `/api/v1/aa/consent/create` | POST | DPoP | Stateless Sahamati FIU consent creation |
| `/api/v1/aa/fi/fetch/:sessionId` | GET | DPoP | Forwards untouched encrypted FIP data to phone RAM |
| `/api/v1/ai/copilot-intent` | POST | DPoP | Verhoeff & PAN-scrubbed tax intent parser |
| `/api/v1/compliance/portal-health`| GET | None | Real-time Income Tax portal health telemetry |
