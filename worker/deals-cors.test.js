// The Whop-hosted storefront reads the live feed cross-origin.
//
// deal-profit-site.whop.site is a different origin to goosiev.com, so without
// an explicit allow-origin header the browser blocks the response and the
// storefront silently falls back to its three-post snapshot — which looks
// live and is not. This is the same class of bug as showing a stale deal as a
// current one.
import { describe, it, expect } from 'vitest';
import handler from './index.js';

function mockDealStore() {
  const kv = new Map();
  const handle = async (url) => {
    const u = new URL(url);
    switch (u.pathname) {
      case '/subscriptions/get':
        return new Response(JSON.stringify({ ok: true, subscription: null }), {
          headers: { 'Content-Type': 'application/json' },
        });
      case '/get':
        return new Response(JSON.stringify({ value: kv.get(u.searchParams.get('key')) ?? null }), {
          headers: { 'Content-Type': 'application/json' },
        });
      default:
        return new Response(JSON.stringify({ error: 'not_found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  };
  return {
    idFromName: () => 'test-id',
    get: () => ({ fetch: (url) => handle(url) }),
  };
}

const env = {
  ADMIN_USERNAME: 'goosievv',
  ADMIN_PASSWORD: 'testpass',
  DEAL_STORE: mockDealStore(),
};

const req = (path, init) => new Request(`https://goosiev.com${path}`, init);

describe('/api/deals is readable by the Whop storefront', () => {
  it('sends an allow-origin header on GET', async () => {
    const res = await handler.fetch(req('/api/deals'), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('answers the CORS preflight', async () => {
    // A cross-origin GET with a custom Accept header triggers a preflight. No
    // OPTIONS handler means the browser never issues the real request.
    const res = await handler.fetch(req('/api/deals', { method: 'OPTIONS' }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('still serves the feed itself', async () => {
    const res = await handler.fetch(req('/api/deals'), env);
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body).toHaveProperty('deals');
  });

  it('does not open CORS on anything that touches a session', async () => {
    // The allow-origin is scoped to the deals route only. Subscription status
    // carries a session and must not become readable cross-origin.
    const res = await handler.fetch(req('/api/user/subscription'), env);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
