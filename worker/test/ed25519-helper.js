// Test-only helpers: sign interaction bodies with a throwaway Ed25519 key
// (mirrors what Discord does) and seed/read review records in the mock store.
import crypto from 'node:crypto';
import fs from 'node:fs';

const KEYS = JSON.parse(fs.readFileSync('/tmp/opencode/ed_test_keys.json', 'utf8'));

export const TEST_PUBLIC_KEY_B64 = Buffer.from(KEYS.publicHex, 'hex').toString('base64');

export async function sign(body, _unused) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from('302e020100300506032b657004220420', 'hex'),
      Buffer.from(KEYS.privateHex, 'hex'),
    ]),
    format: 'der',
    type: 'pkcs8',
  });
  const signature = crypto.sign(null, Buffer.from(timestamp + body), privateKey);
  return { signature: signature.toString('hex'), timestamp };
}
