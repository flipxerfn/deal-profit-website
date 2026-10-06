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

describe('the asset fallback can actually fire', () => {
  it('reads the binding under the name wrangler.toml declares', () => {
    // The binding name is the single source of truth; the worker must use it
    // identically on both sides of the check.
    const binding = toml.match(/^\s*binding\s*=\s*"(\w+)"/m)?.[1];
    expect(binding, 'no assets binding in wrangler.toml').toBeTruthy();

    // Scoped to the guard rather than matched anywhere in the file. A single
    // line was the wrong unit: the fetch is no longer a one-line
    // `return env.X.fetch(request)` — the 404 handling above it needs
    // statements — so the regex found nothing and reported the binding as
    // "not found", which reads as a missing fallback when the fallback is
    // present and working. Whitespace is normalised so the guard is found
    // however it happens to be wrapped.
    const guard = worker
      .replace(/\s+/g, ' ')
      .match(new RegExp(`if \\(env\\.${binding}\\) \\{([^}]*)\\}`, 'i'));

    expect(guard, `no if (env.${binding}) guard in worker/index.js`).toBeTruthy();

    const body = guard[1];
    const called = body.match(new RegExp(`env\\.${binding}\\.fetch\\(request\\)`, 'i'));
    expect(
      called,
      `the guard checks env.${binding} but never fetches env.${binding}(request) — the ` +
        'condition can be true and still serve nothing'
    ).toBeTruthy();
  });

  it('there is a final fallback so a miss is still a 404', () => {
    // Local dev has no ASSETS binding at all. Without this the worker would
    // return undefined, which is itself a 500.
    expect(worker).toMatch(/return new Response\('Not found', \{ status: 404 \}\)/);
  });
});
