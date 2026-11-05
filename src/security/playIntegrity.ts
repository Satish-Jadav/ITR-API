import { GoogleAuth } from 'google-auth-library';
import { env } from '../config/env.js';

export interface PlayIntegrityVerdict {
  isValid: boolean;
  verdictLevel: 'STRONG' | 'DEVICE' | 'BASIC' | 'DEV_BYPASS';
  packageName?: string;
  error?: string;
}

export async function verifyPlayIntegrityToken(
  token: string,
  expectedNonce: string
): Promise<PlayIntegrityVerdict> {
  const isDevModeAllowed = env.NODE_ENV !== 'production' && env.ALLOW_PLAY_INTEGRITY_DEV_BYPASS;

  // 1. Check for Development / Emulator bypass mode (Strictly forbidden in production)
  if (isDevModeAllowed && token.startsWith('dev_bypass_')) {
    return {
      isValid: true,
      verdictLevel: 'DEV_BYPASS',
      packageName: env.GOOGLE_PLAY_PACKAGE_NAME,
    };
  }

  // 2. Production Play Integrity Verification with Google API
  try {
    if (!env.GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON) {
      if (isDevModeAllowed) {
        return { isValid: true, verdictLevel: 'BASIC', packageName: env.GOOGLE_PLAY_PACKAGE_NAME };
      }
      return { isValid: false, verdictLevel: 'BASIC', error: 'PLAY_INTEGRITY_CREDS_MISSING' };
    }

    const saCredentials = JSON.parse(env.GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT_JSON);
    const auth = new GoogleAuth({
      credentials: {
        client_email: saCredentials.client_email,
        private_key: saCredentials.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/playintegrity'],
    });

    const client = await auth.getClient();
    const res = await client.request<{
      tokenPayloadExternal?: {
        requestDetails?: { nonce?: string; requestPackageName?: string };
        appIntegrity?: { appRecognitionVerdict?: string; certificateSha256Digest?: string[] };
        deviceIntegrity?: { deviceRecognitionVerdict?: string[] };
      };
    }>({
      url: `https://playintegrity.googleapis.com/v1/${env.GOOGLE_PLAY_PACKAGE_NAME}:decodeIntegrityToken`,
      method: 'POST',
      data: { integrityToken: token },
    });

    const payload = res.data.tokenPayloadExternal;
    if (!payload) {
      return { isValid: false, verdictLevel: 'BASIC', error: 'EMPTY_INTEGRITY_PAYLOAD' };
    }

    // Verify Nonce
    if (payload.requestDetails?.nonce !== expectedNonce) {
      return { isValid: false, verdictLevel: 'BASIC', error: 'PLAY_INTEGRITY_NONCE_MISMATCH' };
    }

    // Verify Package Name
    if (payload.requestDetails?.requestPackageName !== env.GOOGLE_PLAY_PACKAGE_NAME) {
      return { isValid: false, verdictLevel: 'BASIC', error: 'PLAY_INTEGRITY_PACKAGE_MISMATCH' };
    }

    // Verify Device Recognition Verdict
    const verdicts = payload.deviceIntegrity?.deviceRecognitionVerdict || [];
    let level: 'STRONG' | 'DEVICE' | 'BASIC' = 'BASIC';
    if (verdicts.includes('MEETS_STRONG_INTEGRITY')) {
      level = 'STRONG';
    } else if (verdicts.includes('MEETS_DEVICE_INTEGRITY')) {
      level = 'DEVICE';
    } else if (verdicts.includes('MEETS_BASIC_INTEGRITY')) {
      level = 'BASIC';
    } else {
      return { isValid: false, verdictLevel: 'BASIC', error: 'FAILED_DEVICE_INTEGRITY' };
    }

    return {
      isValid: true,
      verdictLevel: level,
      packageName: payload.requestDetails?.requestPackageName,
    };
  } catch (err: any) {
    return {
      isValid: false,
      verdictLevel: 'BASIC',
      error: err.message || 'PLAY_INTEGRITY_DECODE_FAILED',
    };
  }
}
