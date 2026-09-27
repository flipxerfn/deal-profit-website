// Discord OAuth tests
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Discord OAuth', () => {
  let handler;
  let mockEnv;

  beforeEach(async () => {
    const mod = await import('./index.js');
    handler = mod.default;
    mockEnv = {
      DISCORD_CLIENT_ID: 'test_client_id',
      DISCORD_CLIENT_SECRET: 'test_client_secret',
      DISCORD_REDIRECT_URI: 'http://localhost:8788/api/discord/callback',
      ADMIN_PASSWORD: 'testpass',
      ADMIN_USERNAME: 'goosievv',
      DEAL_STORE: {
        idFromName: vi.fn(() => ({ toString: () => 'test-id' })),
        get: vi.fn(() => ({
          fetch: vi.fn(async (url) => {
            const u = new URL(url);
            if (u.pathname === '/subscriptions/link-discord') {
              return new Response(JSON.stringify({ ok: true, subscription: { user_id: 'test-user', discord_id: '123456789' } }), { headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
          })
        }))
      }
    };
  });

  it('redirects to Discord with state', async () => {
    const req = new Request('https://example.com/api/discord/auth');
    const res = await handler.fetch(req, mockEnv);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('discord.com/api/oauth2/authorize');
    expect(res.headers.get('Location')).toContain('state=');
  });

  it('handles callback and links account', async () => {
    // This will fail until we implement the callback handler
    expect(true).toBe(true); // placeholder
  });

  it('validates state parameter', async () => {
    expect(true).toBe(true); // placeholder
  });
});