// Site counter endpoint: unique-visitor total + recent-presence online count.
import { describe, it, expect, beforeEach } from 'vitest';

const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function makeEnv() {
  const kv = new Map();
  const handle = async (url, request) => {
    const u = new URL(url);
    switch (u.pathname) {
      case '/get':
        return jsonResponse({ value: kv.get(u.searchParams.get('key')) ?? null });
      case '/put': {
        const body = await request.json().catch(() => ({}));
        if (typeof body.key === 'string') kv.set(body.key, String(body.value ?? ''));
        return jsonResponse({ ok: true });
      }
      default:
        return jsonResponse({ error: 'not_found' }, 404);
    }
  };
  return {
    _kv: kv,
    DEAL_STORE: {
      idFromName: () => 'test-id',
      get: () => ({
        fetch: (url, init) => handle(url, new Request(url, init ?? {})),
      }),
    },
  };
}

function ping(handler, env, vid, ip = '10.0.0.1') {
  return handler.fetch(
    new Request('https://goosiev.com/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify({ vid }),
    }),
    env
  );
}

describe('site counter', () => {
  let handler;
  let env;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    env = makeEnv();
  });

  it('starts at zero and is not cacheable', async () => {
    const res = await handler.fetch(new Request('https://goosiev.com/api/stats'), env);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toEqual({ ok: true, total: 0, online: 0 });
  });

  it('counts a new visitor once and shows them online', async () => {
    const res = await ping(handler, env, 'visitor-one-0001');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, total: 1, online: 1 });

    // Same visitor pings again (reload) — total unchanged, still online
    const again = await ping(handler, env, 'visitor-one-0001', '10.0.0.2');
    expect(await again.json()).toEqual({ ok: true, total: 1, online: 1 });
  });

  it('accumulates distinct visitors and reports them via GET', async () => {
    await ping(handler, env, 'visitor-one-0001');
    await ping(handler, env, 'visitor-two-0002', '10.0.0.2');
    await ping(handler, env, 'visitor-three-0003', '10.0.0.3');

    const res = await handler.fetch(new Request('https://goosiev.com/api/stats'), env);
    expect(await res.json()).toEqual({ ok: true, total: 3, online: 3 });
  });

  it('only counts visitors active within the 5-minute window as online', async () => {
    const now = Date.now();
    env._kv.set(
      'stats:presence',
      JSON.stringify({
        stale_one: now - 6 * 60 * 1000,
        stale_two: now - 5 * 60 * 1000 - 1,
        fresh: now - 60 * 1000,
      })
    );
    env._kv.set('stats:total', '42');

    const res = await handler.fetch(new Request('https://goosiev.com/api/stats'), env);
    expect(await res.json()).toEqual({ ok: true, total: 42, online: 1 });
  });

  it('rejects malformed visitor ids', async () => {
    const res = await ping(handler, env, 'no');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_vid');
  });

  it('caps the presence map at 500 entries', async () => {
    const now = Date.now();
    const big = {};
    for (let i = 0; i < 501; i++) big[`filler-${i}`] = now;
    env._kv.set('stats:presence', JSON.stringify(big));

    const res = await ping(handler, env, 'new-visitor-9999');
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.total).toBe(1);
    expect(data.online).toBeLessThanOrEqual(500);
  });
});
