import crypto from 'node:crypto';

console.log('================================================================');
console.log('ZeroTax-Local Ed25519 Production Key Generator');
console.log('================================================================\n');

// 1. Generate Ed25519 Keypair for Access JWTs (RFC 9449 DPoP)
const jwtKeyPair = crypto.generateKeyPairSync('ed25519');
const jwtPrivPem = jwtKeyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const jwtPubPem = jwtKeyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;

// 2. Generate Ed25519 Keypair for Statutory OTA Bundles
const otaKeyPair = crypto.generateKeyPairSync('ed25519');
const otaPrivHex = otaKeyPair.privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('hex');
const otaPubHex = otaKeyPair.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');

// 3. Generate 64-byte Cryptographic Pepper for Blind Index HMAC-SHA256
const blindIndexPepper = crypto.randomBytes(32).toString('hex');

console.log('# Add these lines to your Vercel Environment Variables and .env:\n');
console.log(`ZEROTAX_ED25519_PRIVATE_KEY_PEM="${jwtPrivPem.replace(/\n/g, '\\n')}"\n`);
console.log(`ZEROTAX_ED25519_PUBLIC_KEY_PEM="${jwtPubPem.replace(/\n/g, '\\n')}"\n`);
console.log(`ZEROTAX_OTA_SIGNING_PRIVATE_KEY_HEX=${otaPrivHex}\n`);
console.log(`ZEROTAX_OTA_PUBLIC_KEY_HEX=${otaPubHex}\n`);
console.log(`ZEROTAX_PAN_BLIND_INDEX_PEPPER=${blindIndexPepper}\n`);

console.log('================================================================');
console.log('✅ Keys generated successfully! Keep private keys secure.');
console.log('================================================================');
