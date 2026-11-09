# ZeroTax API: Production Node.js + Vercel Serverless & Supabase Backend

Zero-Knowledge, CERT-In / RBI / DPDP Act 2023 hardened backend API for the **ZeroTax-Local** Android application.

## Key Capabilities

- **OAuth 2.1 PKCE + RFC 9449 DPoP + Google Play Integrity:** Device-hardware-bound access tokens preventing token replay, emulator bot abuse, and repackaged APK execution.
- **Supabase PostgreSQL & Supabase Storage Co-Location:** Relational metadata, RLS, and opaque `.ztvault` client-encrypted backups stored in Supabase in region `ap-south-1` (Mumbai).
- **Zero-Knowledge Architecture:** Zero plaintext PAN, Aadhaar, salary, or bank details are stored or logged.
- **Stateless RBI Account Aggregator Relay:** FIU JWS signing and routing where financial data remains encrypted with the Android phone's RAM-only ephemeral X25519 key.
- **Ed25519 Statutory OTA Updates:** AY 2026-27 rules (CII 376, Section 87A rebate, standard deduction ₹75,000), SBI TTBR rates (Rule 115), and grandfathered Jan 31 2018 FMVs.
- **Live ITD Portal & Quicko ERI Drivers:** Unified backend bridging official CBDT IEC 2.0 direct gateway and sandbox ERI drivers for live Aadhaar OTP authentication, pre-fill JSON extraction, 26AS/AIS hydration, and ITR submission.
- **VAPT Hardened:** OWASP API Top 10 + CERT-In compliance with strict Zod validation, parameterization, and anti-replay timestamp skew windows.

## Project Structure

```
.
├── api/
│   └── index.ts                 # Vercel Serverless Function entrypoint
├── src/
│   ├── app.ts                   # Hono app with global routes & error handler
│   ├── config/
│   │   ├── env.ts               # Zod-validated environment config
│   │   └── supabase.ts          # Supabase client (PostgreSQL & Storage)
│   ├── security/
│   │   ├── vaptGuards.ts        # Zod input schemas & regexes
│   │   ├── dpopVerifier.ts      # RFC 9449 DPoP & Ed25519 Access JWT
│   │   ├── playIntegrity.ts     # Google Play Integrity API verifier
│   │   └── verhoeffScrubber.ts  # Verhoeff Aadhaar & PAN scrubber
│   ├── middleware/
│   │   ├── edgeFirewall.ts      # Anti-replay, payload limits & CORS block
│   │   └── authGuard.ts         # DPoP + JWT authentication
│   ├── routes/
│   │   ├── auth.ts              # /api/v1/auth/*
│   │   ├── statutory.ts         # /api/v1/statutory/*
│   │   ├── vault.ts             # /api/v1/vault/* (with Supabase Storage)
│   │   ├── aa.ts                # /api/v1/aa/*
│   │   ├── ai.ts                # /api/v1/ai/*
│   │   ├── portal.ts            # /api/v1/portal/* (Live ITD & ERI Bridge)
│   │   └── compliance.ts        # /api/v1/compliance/*
│   └── services/
│       ├── portalDriverService.ts # CBDT IEC 2.0 & Quicko ERI integration
│       ├── vaultService.ts      # Supabase Storage & DB operations for .ztvault
│       ├── statutoryService.ts  # TTBR, FMV, IFSC, and OTA bundles
│       └── auditService.ts      # CERT-In VAPT audit logger
├── scripts/
│   ├── db-push.js               # Resilient Drizzle schema provisioner
│   └── generate-keys.js         # Ed25519 cryptographic key generator
├── supabase/
│   ├── migrations/              # Supabase PostgreSQL DDL & Storage policies
│   └── seed/                    # AY 2026-27 statutory seed data
└── DEPLOYMENT.md                # Step-by-step production deployment guide
```

## Quick Start (Development & Verification)

### Prerequisites
- Node.js 22 LTS or later
- npm 10+

### Setup Commands
```bash
# 1. Install dependencies
npm install

# 2. Generate Ed25519 signing keys
npm run generate-keys

# 3. Run comprehensive test suite (48/48 tests passing)
npm test

# 4. Verify TypeScript compilation and linting
npm run build
npm run lint

# 5. Launch local development server
npm run dev
```

### Production Build Verification
The API build pipeline is strictly verified for zero compilation warnings and zero runtime blockers:
- **`npm run build`**: Executes `tsc -p tsconfig.json` and resiliently executes schema synchronization.
- **`npm run vercel-build`**: Optimized for Vercel Serverless deployments. Safely skips DB push when remote database secrets are pending provisioning during preview builds.
- **Node.js 22 Resilience**: `scripts/db-push.js` automatically unwraps Node 22 `AggregateError [ECONNREFUSED]` when testing offline.

## Core API Endpoints

| Head | Endpoint | Method | Description |
|---|---|---|---|
| **Portal** | `/api/v1/portal/otp/request` | `POST` | Dispatches Aadhaar/ITD portal login OTP |
| **Portal** | `/api/v1/portal/otp/verify` | `POST` | Validates 6-digit OTP & returns verified session token |
| **Portal** | `/api/v1/portal/sync` | `POST` | Concurrent pre-fill, 26AS TDS & AIS hydration |
| **Portal** | `/api/v1/portal/submit` | `POST` | Transmits signed CBDT JSON & executes e-verification |
| **Auth** | `/api/v1/auth/exchange` | `POST` | Hardware-bound DPoP & Play Integrity token exchange |
| **Statutory**| `/api/v1/statutory/manifest` | `GET` | AY 2026-27 rules (CII 376, Section 87A, 80C..80U) |
| **Statutory**| `/api/v1/statutory/timeline` | `GET` | Live statutory deadlines & advance tax milestones |
| **Vault** | `/api/v1/vault/backup-sync` | `POST` | Zero-knowledge encrypted `.ztvault` state storage |
| **AI** | `/api/v1/ai/copilot` | `POST` | On-device fallback Gemini AI tax guidance |

For production deployment to Vercel and Supabase, see [DEPLOYMENT.md](DEPLOYMENT.md).
