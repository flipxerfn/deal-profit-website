// The success channel is configured through the admin panel rather than an env
// var, so moving it in Discord must not need a redeploy.
//
// Two things this gates, both of which are invisible when broken:
//  1. The field exists in the panel at all. If it is missing, the band stays
//     permanently empty and the site looks like it has no members.
//  2. Clearing it works. An omitted value is preserved server-side, so a save
//     that drops the field silently keeps the old channel instead of turning
//     the band off — which is why the client always sends the value, blank
//     included.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const panel = readFileSync(resolve(root, 'src/routes/admin/AdminSettings.jsx'), 'utf8');
const worker = readFileSync(resolve(root, 'worker/index.js'), 'utf8');
const posts = readFileSync(resolve(root, 'worker/successPosts.js'), 'utf8');

/**
 * Source with comments removed.
 *
 * Both gates below tripped on prose rather than code: the file carries a
 * comment that contains the literal `{ ...env, loadConfig }` while explaining
 * why that pattern breaks, so a raw-text scan flagged the fix as the bug. A
 * gate has to read the code or it enforces nothing.
 */
const code = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

const workerCode = code(worker);

describe('the success channel is settable without a redeploy', () => {
  it('the panel exposes the field', () => {
    expect(panel).toMatch(/Member Success Channel/);
    expect(panel).toMatch(/successChannelId/);
    expect(panel).toMatch(/aria-label="Member success channel ID"/);
  });

  it('loads the current value so it is not silently cleared', () => {
    expect(panel).toMatch(/setSuccessChannel\(body\.config\.successChannelId \?\? ''\)/);
  });

  it('always sends the value, blank included', () => {
    // The server treats an omitted field as "keep the existing value", so a
    // save that omits it would never be able to turn the band off.
    expect(panel).toMatch(/JSON\.stringify\(\{ token, categories, successChannelId: successChannel \}\)/);
  });

  it('the server preserves an omitted value but accepts a clear', () => {
    // Assert on the mechanism, not the wording of the comment above it — the
    // first version of this test matched a phrase from a comment, which fails
    // the moment the comment is reworded and passes even if the code changes.
    expect(worker).toMatch(/: prev\.successChannelId \?\? ''/);
    expect(worker).toMatch(/typeof successChannelId === 'string' && successChannelId\.trim\(\)/);
  });

  it('accepts a pasted link as well as a bare ID', () => {
    // People copy channel links from the Discord UI, not snowflakes.
    expect(worker).toMatch(/\\d\{15,25\}/);
    expect(posts).toMatch(/\\d\{15,25\}/);
  });
});

describe('the public endpoint is read-only', () => {
  it('answers GET and refuses writes', () => {
    // A public endpoint that accepted POST would be a way to have the server
    // call Discord on demand, which is a cheap amplification primitive.
    expect(worker).toMatch(/method_not_allowed/);
    expect(worker).toMatch(/if \(url\.pathname\.startsWith\('\/api\/success'\)\)/);
  });

  it('never returns the bot token or a Discord session', () => {
    // Sliced to the handler's own body, bounded at the next function. Asserting
    // this against the whole file can never pass, since the file legitimately
    // reads the token elsewhere.
    const start = workerCode.indexOf('async function handleSuccess');
    const handler = workerCode.slice(
      start,
      workerCode.indexOf('async function handleReviewsAdmin', start)
    );
    expect(handler.length).toBeGreaterThan(200);
    // Reading the binding to hand it to the fetcher is correct and required.
    // What must never happen is the VALUE reaching the response, so this
    // inspects the returned payload only.
    expect(handler, 'handler reads a Discord session').not.toMatch(/getDiscordSession/);

    // The success payload is the final return. Enumerate the keys it sends so
    // a future field cannot slip a secret in without this noticing.
    const last = handler.lastIndexOf('return json(');
    const payload = handler.slice(last);
    const keys = [...payload.matchAll(/(\w+):/g)].map((m) => m[1]);
    expect(keys, 'payload keys changed, review for secrets').toEqual(
      expect.arrayContaining(['ok', 'configured', 'posts', 'caveat'])
    );
    expect(keys, 'payload must not include a token field').not.toContain('token');
    expect(payload, 'the raw bot token is echoed').not.toMatch(/DISCORD_BOT_TOKEN/);
  });

  it('carries the caveat on every response, including empty ones', () => {
    // The empty feed is still a public claim about the server, so the
    // qualification ships with it.
    const handler = worker.slice(worker.indexOf('async function handleSuccess'));
    expect(handler).toMatch(/caveat: CAVEAT/);
  });

  it('closes loadConfig over env instead of passing a bare reference', () => {
    // This shipped a 500 on every request, twice, and the first fix was aimed
    // at the wrong object.
    //
    // `{ ...env, loadConfig }` spreads the Worker env, which copies only own
    // enumerable properties — KV bindings live on the env prototype, so the
    // spread loses them. Changing it to a bare `loadConfig` reference was worse
    // in a quieter way: fetchSuccessPosts then called it with no argument, so
    // `env` was undefined inside loadConfig, that undefined reached kvGet, and
    // `env.DEAL_STORE` was read off nothing.
    //
    // The working form binds the real env in a closure. A unit test cannot see
    // a binding that fails to resolve, so the endpoint is verified with curl
    // after deploy; these gates stop both wrong patterns returning.
    expect(workerCode, 'spreading env loses KV bindings').not.toMatch(
      /\{\s*\.\.\.env\s*[,}]/
    );
    expect(workerCode, 'loadConfig must be bound to env, not passed bare').toMatch(
      /loadConfig:\s*\(\)\s*=>\s*loadConfig\(env\)/
    );
    expect(workerCode, 'a bare loadConfig reference is the original bug').not.toMatch(
      /[,{]\s*loadConfig,?\s*\}/
    );
  });
});
