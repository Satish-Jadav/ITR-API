# ZeroTax API: Production Node.js + Vercel Serverless & Supabase Backend

Zero-Knowledge, CERT-In / RBI / DPDP Act 2023 hardened backend API for the **ZeroTax-Local** Android application.

## Key Capabilities

- **OAuth 2.1 PKCE + RFC 9449 DPoP + Google Play Integrity:** Device-hardware-bound access tokens preventing token replay, emulator bot abuse, and repackaged APK execution.
- **Supabase PostgreSQL & Supabase Storage Co-Location:** Relational metadata, RLS, and opaque `.ztvault` client-encrypted backups stored in Supabase in region `ap-south-1` (Mumbai).
- **Zero-Knowledge Architecture:** Zero plaintext PAN, Aadhaar, salary, or bank details are stored or logged.
- **Stateless RBI Account Aggregator Relay:** FIU JWS signing and routing where financial data remains encrypted with the Android phone's RAM-only ephemeral X25519 key.
- **Ed25519 Statutory OTA Updates:** AY 2026-27 rules (CII 376, Section 87A rebate, standard deduction ₹75,000), SBI TTBR rates (Rule 115), and grandfathered Jan 31 2018 FMVs.
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
│   │   └── compliance.ts        # /api/v1/compliance/*
│   └── services/
│       ├── vaultService.ts      # Supabase Storage & DB operations for .ztvault
│       ├── statutoryService.ts  # TTBR, FMV, IFSC, and OTA bundles
│       └── auditService.ts      # CERT-In VAPT audit logger
├── supabase/
│   ├── migrations/              # Supabase PostgreSQL DDL & Storage policies
│   └── seed/                    # AY 2026-27 statutory seed data
└── DEPLOYMENT.md                # Step-by-step production deployment guide
```

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Generate Ed25519 signing keys
npm run generate-keys

# Run local test suite
npm test

# Run local development server
npm run dev
```

For production deployment to Vercel and Supabase, see [DEPLOYMENT.md](DEPLOYMENT.md).
