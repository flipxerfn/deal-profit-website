// Test-only helpers: sign interaction bodies with a throwaway Ed25519 key
// (mirrors what Discord does) and seed/read review records in the mock store.
//
// WHY THIS GENERATES ITS OWN KEY
// -------------------------------
// This used to read a keypair from a hardcoded absolute path,
// `/tmp/opencode/ed_test_keys.json`. That is my scratch directory, not a
// project location, so the file only existed on the machine that happened to
// write it. Everywhere else the suite failed at import time with a bare
// ENOENT before a single test ran — which is why `worker/review-buttons.test.js`
// had been sitting red in the test output for so long: it was a collection
// error, not a test failure, and the error said nothing about the code.
//
// Generating the pair in-process removes the external dependency entirely. The
// key is throwaway by design — it is never a secret and is never used against
// anything but the worker's own signature check in these tests — so there is
// no reason for it to be persisted at all. It also means the public key handed
// to the worker and the private key used to sign can never drift apart, which
// is the failure mode a shared file eventually hits.
import crypto from 'node:crypto';

// PKCS#8 prefix for an Ed25519 private key: version 0, algorithm id 1.3.101.112
// (id-Ed25519), and the 32-byte seed length wrapped in an OCTET STRING.
const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

export const TEST_PUBLIC_KEY_B64 = publicKey.export({ format: 'der', type: 'spki' })
  .subarray(-32) // the raw 32-byte key is the tail of the SPKI encoding
  .toString('base64');

/**
 * Sign a request body the way Discord does.
 *
 * Discord signs `timestamp + body` with Ed25519 and sends the signature hex in
 * X-Signature-Ed25519 alongside the timestamp. The timestamp is part of the
 * SIGNED PAYLOAD, not just a header — signing the body alone would pass a
 * freshness check that nothing is actually testing.
 */
export async function sign(body) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = crypto.sign(null, Buffer.from(timestamp + body), privateKey);
  return { signature: signature.toString('hex'), timestamp };
}