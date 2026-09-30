// `if (env.ASSETS) return env.ASETS.fetch(request);`
//
// The static-asset binding is named ASSETS in wrangler.toml. The fallback read
// it as env.ASETS, one letter different, so the condition was never true and
// every unmatched path fell through to a bare 404 Response. In production the
// worker instead threw on the undefined binding, so any URL that is not an
// exact route match returned Cloudflare's "error code 1101" instead of the
// site: a typo'd link, a stale bookmark, a deep link outside the client router.
//
// It is a one-character bug that no unit test caught, because the tests call
// `handler.fetch` directly with a mock env and never exercise the asset
// fallback. The gate below reads the two identifiers out of the source and
// requires them to be the same string, which is the property that matters.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const worker = readFileSync(resolve(root, 'worker/index.js'), 'utf8');
const toml = readFileSync(resolve(root, 'wrangler.toml'), 'utf8');

const line = worker
  .split('\n')
  .find((l) => /env\.\w+\.fetch\(request\)/.test(l));

describe('the asset fallback can actually fire', () => {
  it('reads the binding under the name wrangler.toml declares', () => {
    // The binding name is the single source of truth; the worker must use it
    // identically on both sides of the check.
    const binding = toml.match(/^\s*binding\s*=\s*"(\w+)"/m)?.[1];
    expect(binding, 'no assets binding in wrangler.toml').toBeTruthy();

    const read = line?.match(/env\.(\w+)\)/)?.[1];
    const called = line?.match(/return env\.(\w+)\.fetch/)?.[1];
    expect(read, `fallback line not found: ${line}`).toBe(binding);
    expect(called, 'the property is fetched under a different name than it is checked').toBe(binding);
  });

  it('there is a final fallback so a miss is still a 404', () => {
    // Local dev has no ASSETS binding at all. Without this the worker would
    // return undefined, which is itself a 500.
    expect(worker).toMatch(/return new Response\('Not found', \{ status: 404 \}\)/);
  });
});
