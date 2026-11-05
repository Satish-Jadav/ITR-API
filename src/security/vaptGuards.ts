import { z } from 'zod';
import crypto from 'node:crypto';

// Strict Hex & Identifier Regexes
export const HEX_64_REGEX = /^[0-9a-f]{64}$/;
export const HEX_32_REGEX = /^[0-9a-f]{32}$/;
export const HEX_24_REGEX = /^[0-9a-f]{24}$/;
export const ISIN_REGEX = /^IN[A-Z0-9]{10}$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AY_REGEX = /^20[2-3][0-9]-[0-9]{2}$/;

// SQL Injection & Command Injection Characters Blocklist (CWE-89)
export const SQLI_CONTROL_REGEX = /(\u0000|--|\/\*|\*\/|;|\bATTACH\s+DATABASE\b|\bDROP\s+TABLE\b|\bUNION\s+SELECT\b|\bINFORMATION_SCHEMA\b)/i;

// 1. Auth Schemas
export const PkceChallengeRequestSchema = z
  .object({
    codeChallenge: z.string().min(43).max(128).regex(/^[A-Za-z0-9\-_]+$/),
    codeChallengeMethod: z.literal('S256'),
    deviceInstallationId: z.string().uuid(),
    dpopPublicKeyJwk: z
      .object({
        kty: z.literal('EC'),
        crv: z.literal('P-256'),
        x: z.string().min(40).max(48),
        y: z.string().min(40).max(48),
      })
      .strict(),
  })
  .strict();

export const GooglePkceExchangeRequestSchema = z
  .object({
    authSessionId: z.string().uuid(),
    codeVerifier: z.string().min(43).max(128).regex(/^[A-Za-z0-9\-_]+$/),
    googleIdToken: z.string().min(10),
    playIntegrityToken: z.string().min(10),
    dpdpSection6Consent: z
      .object({
        consentVersion: z.string().default('2026.1'),
        languageCode: z.enum(['en-IN', 'hi-IN', 'gu-IN', 'mr-IN', 'ta-IN', 'te-IN']).default('en-IN'),
        acceptedAtEpochMs: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();

export const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string().min(32).max(128),
    deviceInstallationId: z.string().uuid(),
  })
  .strict();

export const DpdpShredRequestSchema = z
  .object({
    confirmErasurePhrase: z.literal('SHRED_MY_ZEROTAX_DATA'),
    revokeActiveAaConsents: z.boolean().default(true),
  })
  .strict();

// 2. Vault Schemas
export const VaultSyncPutSchema = z
  .object({
    panBlindIndexHmac: z.string().regex(HEX_64_REGEX),
    assessmentYear: z.string().regex(AY_REGEX),
    relationshipTag: z.enum(['SELF', 'SPOUSE', 'FATHER', 'MOTHER', 'HUF']),
    expectedPreviousVersion: z.number().int().min(0).max(10000),
    pbkdf2SaltHex: z.string().regex(HEX_64_REGEX),
    aesGcmIvHex: z.string().regex(HEX_24_REGEX),
    aesGcmAuthTagHex: z.string().regex(HEX_32_REGEX),
    ciphertextPayloadBase64: z.string().min(32).max(10_485_760).regex(/^[A-Za-z0-9+/=]+$/),
    ciphertextSha256Hex: z.string().regex(HEX_64_REGEX),
  })
  .strict()
  .refine(
    (data) => {
      const rawBytes = Buffer.from(data.ciphertextPayloadBase64, 'base64');
      const computedHex = crypto.createHash('sha256').update(rawBytes).digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(computedHex, 'utf8'),
        Buffer.from(data.ciphertextSha256Hex, 'utf8')
      );
    },
    { message: 'VAPT Integrity Failure: Ciphertext SHA-256 mismatch.' }
  );

// 3. Statutory Schemas
export const IsinBatchLookupSchema = z
  .object({
    isinCodes: z.array(z.string().regex(ISIN_REGEX)).min(1).max(200),
  })
  .strict();

// 4. RBI Account Aggregator Schemas
export const AaConsentCreateSchema = z
  .object({
    aaHandle: z.string().min(5).max(64).regex(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/),
    fiTypes: z.array(z.enum(['DEPOSIT', 'MUTUAL_FUNDS', 'EQUITIES', 'TERM_DEPOSIT', 'INSURANCE_POLICIES'])).min(1),
    dataRangeFromIso: z.string().datetime(),
    dataRangeToIso: z.string().datetime(),
    apkEphemeralX25519PublicKeyBase64: z.string().min(20).max(128),
    apkFiuNonceBase64: z.string().min(16).max(64),
  })
  .strict();

export const AaFiRequestSchema = z
  .object({
    consentId: z.string().uuid(),
    apkEphemeralX25519PublicKeyBase64: z.string().min(20).max(128),
    apkFiuNonceBase64: z.string().min(16).max(64),
  })
  .strict();

// 5. AI Schemas
export const SanitizedAiCopilotRequestSchema = z
  .object({
    sanitizedQuery: z
      .string()
      .min(2)
      .max(500)
      .refine((val) => !SQLI_CONTROL_REGEX.test(val), 'Blocked SQL/Control sequence')
      .refine((val) => !PAN_REGEX.test(val), 'Unredacted PAN rejected by VAPT gate'),
    targetLocale: z.enum(['en-IN', 'hi-IN', 'gu-IN', 'mr-IN', 'ta-IN', 'te-IN']).default('en-IN'),
  })
  .strict();

export const AiForm16ExtractSchema = z
  .object({
    sanitizedRawText: z
      .string()
      .min(10)
      .max(50000)
      .refine((val) => !SQLI_CONTROL_REGEX.test(val), 'Blocked SQL/Control sequence')
      .refine((val) => !PAN_REGEX.test(val), 'Unredacted PAN detected. Form 16 text must be masked.'),
    assessmentYear: z.string().regex(AY_REGEX).default('2026-27'),
  })
  .strict();

export const AiBankBatchClassifySchema = z
  .object({
    narrations: z
      .array(
        z
          .string()
          .min(2)
          .max(120)
          .refine((val) => !SQLI_CONTROL_REGEX.test(val), 'Blocked SQL/Control sequence in narration')
      )
      .min(1)
      .max(50),
  })
  .strict();

// 6. Compliance & CA Schemas
export const CaShareCreateSchema = z
  .object({
    encryptedDossierBlobBase64: z.string().min(32).max(5_242_880),
    aesGcmIvHex: z.string().regex(HEX_24_REGEX),
    maxViews: z.number().int().min(1).max(10).default(3),
    durationHours: z.number().int().min(1).max(72).default(48),
  })
  .strict();

export const FcmRegisterSchema = z
  .object({
    deviceId: z.string().min(8).max(64),
    fcmToken: z.string().min(16).max(512),
    preferredLocale: z.enum(['en-IN', 'hi-IN', 'gu-IN', 'mr-IN', 'ta-IN', 'te-IN']).default('en-IN'),
    advanceTaxAlertsEnabled: z.boolean().default(true),
  })
  .strict();
