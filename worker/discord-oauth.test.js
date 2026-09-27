// Discord OAuth tests: state cookie correctness, multi-state tolerance, callback outcomes
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function extractCookie(res, name) {
  const raw = res.headers.get('Set-Cookie') || '';
  // Find the cookie whose name matches exactly (guards against the
  // historical bug where the value carried a doubled "Set-Cookie: " prefix)
  const parts = raw.split(/\n/);
  for (const p of parts) {
    if (p.startsWith(`${name}=`)) return p;
  }
  return null;
}

describe('Discord OAuth', () => {
  let handler;
  let mockEnv;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    const doStub = {
      fetch: vi.fn(async (url, init) => {
        const u = new URL(url);
        if (u.pathname === '/subscriptions/link-discord') {
          return new Response(JSON.stringify({ ok: true, subscription: { user_id: 'test-user', discord_id: '123456789' } }), { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      })
    };
    mockEnv = {
      DISCORD_CLIENT_ID: 'test_client_id',
      DISCORD_CLIENT_SECRET: 'test_client_secret',
      DISCORD_REDIRECT_URI: 'http://localhost:8788/api/discord/callback',
      ADMIN_PASSWORD: 'testpass',
      ADMIN_USERNAME: 'goosievv',
      DEAL_STORE: {
        idFromName: vi.fn(() => ({ toString: () => 'test-id' })),
        get: vi.fn(() => doStub)
      }
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects to Discord with a correctly-formed state cookie', async () => {
    const req = new Request('https://example.com/api/discord/auth');
    const res = await handler.fetch(req, mockEnv);
    expect(res.status).toBe(302);
    const loc = res.headers.get('Location');
    expect(loc).toContain('discord.com/api/oauth2/authorize');
    expect(loc).toContain('state=');

    const cookie = extractCookie(res, 'dp_oauth_state');
    expect(cookie).toBeTruthy();
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=1800');
    // 302 redirects must never be cached: a replayed redirect carries a stale state
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('accepts any of several recent states (double-click / back+retry)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('bad', { status: 400 })));

    const req = new Request('https://example.com/api/discord/callback?code=abc&state=state2', {
      headers: { Cookie: 'dp_oauth_state=state1|state2|state3' },
    });
    const res = await handler.fetch(req, mockEnv);
    // passed state validation: proceeded to Discord token exchange (which failed on the fake code)
    expect(fetch).toHaveBeenCalledWith('https://discord.com/api/oauth2/token', expect.anything());
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/upgrade?linked=failed');
  });

  it('rejects a state that is not in the cookie without calling Discord', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unreachable', { status: 500 })));

    const req = new Request('https://example.com/api/discord/callback?code=abc&state=evil', {
      headers: { Cookie: 'dp_oauth_state=state1|state2' },
    });
    const res = await handler.fetch(req, mockEnv);
    expect(fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/upgrade?linked=failed');
    expect(extractCookie(res, 'dp_oauth_state')).toContain('Max-Age=0');
  });

  it('rejects a missing cookie without calling Discord', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('unreachable', { status: 500 })));

    const req = new Request('https://example.com/api/discord/callback?code=abc&state=anything');
    const res = await handler.fetch(req, mockEnv);
    expect(fetch).not.toHaveBeenCalled();
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/upgrade?linked=failed');
  });

  it('completes the full callback: session cookie set, state cleared, lands on /upgrade', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'tok_123', token_type: 'Bearer' }), { headers: { 'Content-Type': 'application/json' } });
      }
      if (String(url).includes('/users/@me')) {
        return new Response(JSON.stringify({ id: '123456789012345678', username: 'tester' }), { headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('not found', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = new Request('https://example.com/api/discord/callback?code=goodcode&state=state1', {
      headers: { Cookie: 'dp_oauth_state=state1' },
    });
    const res = await handler.fetch(req, mockEnv);

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://example.com/upgrade?linked=true');

    const cookies = res.headers.get('Set-Cookie');
    expect(cookies).toContain('dp_session=');
    expect(cookies).toContain('dp_oauth_state=;');
    expect(res.headers.get('Cache-Control')).toContain('no-store');

    // identity recorded: link-discord called with user_id === discord id
    const doStub = mockEnv.DEAL_STORE.get();
    const linkCall = doStub.fetch.mock.calls.find(([u]) => String(u).includes('/subscriptions/link-discord'));
    expect(linkCall).toBeTruthy();
    const body = JSON.parse(linkCall[1].body);
    expect(body).toEqual({ user_id: '123456789012345678', discord_id: '123456789012345678' });
  });
});
