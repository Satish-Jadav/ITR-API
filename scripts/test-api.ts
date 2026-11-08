import { app } from '../src/app.js';
import { scrubVerhoeffAndPan } from '../src/security/verhoeffScrubber.js';

console.log('🧪 Running ZeroTax VAPT Security & Route Verification Tests...\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  const nowSec = Math.floor(Date.now() / 1000);

  // Test 1: Health check
  const healthRes = await app.request('/health');
  assert(healthRes.status === 200, 'GET /health returns 200 OK');
  const healthJson = (await healthRes.json()) as any;
  assert(healthJson.status === 'ONLINE', 'Health JSON reports ONLINE');

  // Test 2: VAPT-12 - Reject Browser Origin
  const corsRes = await app.request('/api/v1/statutory/manifest', {
    headers: {
      origin: 'https://malicious-website.com',
    },
  });
  assert(corsRes.status === 403, 'VAPT-12: Reject Browser Origin with 403');
  const corsJson = (await corsRes.json()) as any;
  assert(corsJson.errorCode === 'VAPT_12_BROWSER_ORIGIN_FORBIDDEN', 'Error code is VAPT_12_BROWSER_ORIGIN_FORBIDDEN');

  // Test 3: VAPT-04 - Timestamp clock skew rejection
  const skewRes = await app.request('/api/v1/auth/oauth/challenge', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec - 120), // 2 minutes in the past
    },
    body: JSON.stringify({
      codeChallenge: 'E9Melhoa2OwvFrGMTJguCHaoeK1t8URWbuGJSstw-cM',
      codeChallengeMethod: 'S256',
      deviceInstallationId: '550e8400-e29b-41d4-a716-446655440000',
      dpopPublicKeyJwk: {
        kty: 'EC',
        crv: 'P-256',
        x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
        y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
      },
    }),
  });
  assert(skewRes.status === 401, 'VAPT-04: Rejects timestamp skew > 30s with 401');
  const skewJson = (await skewRes.json()) as any;
  assert(skewJson.errorCode === 'VAPT_04_TIMESTAMP_SKEW_OR_REPLAY', 'Error code matches VAPT_04_TIMESTAMP_SKEW_OR_REPLAY');

  // Test 4: VAPT-08 - Payload Too Large (> 512KB for non-vault)
  const largePayload = JSON.stringify({ query: 'x'.repeat(600 * 1024) });
  const largeRes = await app.request('/api/v1/ai/copilot-intent', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(largePayload)),
      'x-zerotax-timestamp': String(nowSec),
    },
    body: largePayload,
  });
  assert(largeRes.status === 413, 'VAPT-08: Rejects payload exceeding size limit with 413');

  // Test 5: Statutory Manifest with valid timestamp
  const manifestRes = await app.request('/api/v1/statutory/manifest?ay=2026-27', {
    headers: {
      'x-zerotax-timestamp': String(nowSec),
    },
  });
  assert(manifestRes.status === 200, 'GET /api/v1/statutory/manifest with valid timestamp returns 200');
  const manifestJson = (await manifestRes.json()) as any;
  assert(manifestJson.assessmentYear === '2026-27', 'Manifest contains AY 2026-27');
  assert(manifestJson.cii2025_26 === 376, 'Manifest contains CII 376');

  // Test 6: Auth Challenge Request
  const challengeRes = await app.request('/api/v1/auth/oauth/challenge', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec),
    },
    body: JSON.stringify({
      codeChallenge: 'E9Melhoa2OwvFrGMTJguCHaoeK1t8URWbuGJSstw-cM',
      codeChallengeMethod: 'S256',
      deviceInstallationId: '550e8400-e29b-41d4-a716-446655440000',
      dpopPublicKeyJwk: {
        kty: 'EC',
        crv: 'P-256',
        x: 'f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU',
        y: 'x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0',
      },
    }),
  });
  assert(challengeRes.status === 200, 'POST /api/v1/auth/oauth/challenge returns 200 OK');
  const challengeJson = (await challengeRes.json()) as any;
  assert(!!challengeJson.authSessionId, 'Challenge returns authSessionId');
  assert(!!challengeJson.playIntegrityNonce, 'Challenge returns playIntegrityNonce');

  // Test 7: Compliance Portal Health
  const portalRes = await app.request('/api/v1/compliance/portal-health');
  assert(portalRes.status === 200, 'GET /api/v1/compliance/portal-health returns 200 OK');
  const portalJson = (await portalRes.json()) as any;
  assert(['HEALTHY', 'DOWN', 'DEGRADED'].includes(portalJson.eportalStatus), 'Portal status is one of HEALTHY, DOWN, DEGRADED');

  // Test 8: Database Diagnostic Health Check
  const dbHealthRes = await app.request('/health/db');
  const dbHealthJson = (await dbHealthRes.json()) as any;
  assert(dbHealthJson.status === 'HEALTHY' || dbHealthJson.status === 'UNHEALTHY', 'GET /health/db returns structured diagnostic health payload');
  assert(!!dbHealthJson.host && !!dbHealthJson.port, 'GET /health/db includes target host and port');
  if (dbHealthJson.status === 'UNHEALTHY') {
    assert(!!dbHealthJson.error, 'Unhealthy DB status includes error root-cause details');
  }


  // Test 9: Portal OTP Request
  const otpReqRes = await app.request('/api/v1/portal/otp/request', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec),
    },
    body: JSON.stringify({
      pan: 'ABCDE1234F',
      purpose: 'LOGIN_PORTAL',
    }),
  });
  assert(otpReqRes.status === 200, 'POST /api/v1/portal/otp/request returns 200 OK');
  const otpReqJson = (await otpReqRes.json()) as any;
  assert(otpReqJson.success === true, 'Portal OTP request successful');
  assert(!!otpReqJson.txnId, 'Portal OTP returns txnId');
  assert(otpReqJson.cooldownSeconds === 60, 'Portal OTP enforces 60s cooldown');

  // Test 10: Portal OTP Verify - Incorrect code rejection
  const badVerifyRes = await app.request('/api/v1/portal/otp/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec),
    },
    body: JSON.stringify({
      pan: 'ABCDE1234F',
      txnId: otpReqJson.txnId,
      otp: '000000',
    }),
  });
  assert(badVerifyRes.status === 400, 'POST /api/v1/portal/otp/verify rejects invalid OTP with 400');
  const badVerifyJson = (await badVerifyRes.json()) as any;
  assert(badVerifyJson.errorCode === 'INVALID_OTP', 'Error code is INVALID_OTP');
  // Test 11: PII Scrubber case-insensitivity & boundary resilience
  const pii1 = scrubVerhoeffAndPan('My PAN is abcde1234f and Aadhaar is 1234 5678 9012');
  assert(pii1.scrubbedText.includes('[PAN_REDACTED]'), 'Scrubber catches lowercase PAN');
  assert(pii1.scrubbedText.includes('[AADHAAR_REDACTED]'), 'Scrubber catches 12-digit spaced Aadhaar');

  const pii2 = scrubVerhoeffAndPan('PAN: ABCDE1234F, Aadhaar: 9999-8888-7777');
  assert(pii2.scrubbedText.includes('[PAN_REDACTED]'), 'Scrubber catches uppercase PAN with punctuation');
  assert(pii2.scrubbedText.includes('[AADHAAR_REDACTED]'), 'Scrubber catches hyphenated Aadhaar');


  // Test 12: Live IFSC Bank Resolver with fallback
  const ifscRes = await app.request('/api/v1/statutory/ifsc/HDFC0000001', {
    method: 'GET',
    headers: { 'x-zerotax-timestamp': String(nowSec) },
  });
  assert(ifscRes.status === 200, 'GET /api/v1/statutory/ifsc/HDFC0000001 returns 200');
  const ifscJson = (await ifscRes.json()) as any;
  assert(ifscJson.ifscCode === 'HDFC0000001', 'IFSC code matches requested code');
  assert(typeof ifscJson.bankName === 'string', 'IFSC resolver returns bank name');

  // Test 13: Live Prefill Ingestion
  const prefillRes = await app.request('/api/v1/portal/ingest-live-prefill', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec),
    },
    body: JSON.stringify({
      pan: 'ABCDE1234F',
      assessmentYear: '2026-27',
      sourceOrigin: 'WEBVIEW_TEST_HARNESS',
      transactions: [
        { grossAmount: 1200000, tdsWithheld: 85000, category: 'SALARY' },
        { grossAmount: 18000, tdsWithheld: 0, category: 'SAVINGS_INTEREST' }
      ]
    }),
  });
  assert(prefillRes.status === 200, 'POST /api/v1/portal/ingest-live-prefill returns 200');
  const prefillJson = (await prefillRes.json()) as any;
  assert(prefillJson.success === true, 'Live prefill ingestion reports success');
  assert(prefillJson.recordCount === 2, 'Live prefill ingests 2 transactions');
  assert(prefillJson.aggregateGrossAmount === 1218000, 'Aggregate gross correctly summed');

  // Test 14: CBDT Submission Router
  const submitRes = await app.request('/api/v1/portal/submit', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec),
    },
    body: JSON.stringify({
      pan: 'ABCDE1234F',
      assessmentYear: '2026-27',
      cbdtJsonPayload: {
        ITR1: {
          CreationInfo: { SWVersionNo: '1.0' },
          PersonalInfo: { PAN: 'ABCDE1234F' }
        }
      }
    }),
  });
  assert(submitRes.status === 200, 'POST /api/v1/portal/submit returns 200');
  const submitJson = (await submitRes.json()) as any;
  assert(submitJson.success === true, 'Submission reports success');
  assert(submitJson.verificationStatus === 'PENDING_EVC', 'Verification status is PENDING_EVC');
  assert(!!submitJson.driver, 'Submission includes active driver identification');

  // Test 15: Portal Driver Status & Priority Routing
  const driverStatusRes = await app.request('/api/v1/portal/driver-status', {
    method: 'GET',
    headers: { 'x-zerotax-timestamp': String(nowSec) },
  });
  assert(driverStatusRes.status === 200, 'GET /api/v1/portal/driver-status returns 200');
  const driverStatusJson = (await driverStatusRes.json()) as any;
  assert(driverStatusJson.success === true, 'Driver status reports success');
  assert(['QUICKO_ERI', 'CBDT_DIRECT_ERI', 'IN_APP_LIVE_DRIVER'].includes(driverStatusJson.activeDriver), 'Active driver is one of QUICKO_ERI, CBDT_DIRECT_ERI, IN_APP_LIVE_DRIVER');
  assert(driverStatusJson.inAppDriverActive === true, 'In-App Live Driver is active as resilient fallback');
  assert(Array.isArray(driverStatusJson.priorityOrder) && driverStatusJson.priorityOrder[0] === 'QUICKO_ERI', 'Priority order puts Quicko first');

  // Test 16: Portal e-Verification Router
  const everifyRes = await app.request('/api/v1/portal/everify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-zerotax-timestamp': String(nowSec),
    },
    body: JSON.stringify({
      pan: 'ABCDE1234F',
      acknowledgmentNumber: '880010100000011',
      otp: '123456',
      evcType: 'AADHAAR_OTP',
    }),
  });
  assert(everifyRes.status === 200, 'POST /api/v1/portal/everify returns 200');
  const everifyJson = (await everifyRes.json()) as any;
  assert(everifyJson.success === true, 'e-Verification reports success');
  assert(!!everifyJson.cpcVerificationRef, 'e-Verification returns CPC verification reference');
  assert(!!everifyJson.driver, 'e-Verification identifies active driver');

  console.log(`\n================================================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
