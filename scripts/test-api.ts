import { app } from '../src/app.js';

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
  assert(portalJson.eportalStatus === 'HEALTHY', 'Portal status is HEALTHY');

  // Test 8: Database Diagnostic Health Check
  const dbHealthRes = await app.request('/health/db');
  const dbHealthJson = (await dbHealthRes.json()) as any;
  assert(dbHealthJson.status === 'HEALTHY' || dbHealthJson.status === 'UNHEALTHY', 'GET /health/db returns structured diagnostic health payload');
  assert(!!dbHealthJson.host && !!dbHealthJson.port, 'GET /health/db includes target host and port');
  if (dbHealthJson.status === 'UNHEALTHY') {
    assert(!!dbHealthJson.error, 'Unhealthy DB status includes error root-cause details');
  }

  console.log(`\n================================================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`================================================================`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
