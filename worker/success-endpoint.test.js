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
    const start = worker.indexOf('async function handleSuccess');
    const handler = worker.slice(start, worker.indexOf('async function handleReviewsAdmin', start));
    expect(handler.length).toBeGreaterThan(200);
    expect(handler, 'handler leaks a token').not.toMatch(/token/i);
    expect(handler, 'handler reads a Discord session').not.toMatch(/getDiscordSession/);
  });

  it('carries the caveat on every response, including empty ones', () => {
    // The empty feed is still a public claim about the server, so the
    // qualification ships with it.
    const handler = worker.slice(worker.indexOf('async function handleSuccess'));
    expect(handler).toMatch(/caveat: CAVEAT/);
  });
});
