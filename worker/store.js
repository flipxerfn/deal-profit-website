// DealStore — a tiny persistent key/value store backed by a Cloudflare Durable Object.
// It holds the admin-managed config (Discord bot token + category IDs) and manual deals
// so they survive Worker isolate recycling and every isolate sees the same data.
// The Worker routes string reads/writes through this object when the DEAL_STORE binding
// exists, otherwise it falls back to memory (local dev / no binding).

export class DealStore {
  constructor(state, _env) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/get') {
      const key = url.searchParams.get('key');
      const raw = await this.state.storage.get(key);
      return new Response(JSON.stringify({ value: typeof raw === 'string' ? raw : null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/put' && request.method === 'POST') {
      const { key, value } = await request.json().catch(() => ({}));
      if (typeof key !== 'string' || key.length === 0) {
        return new Response(JSON.stringify({ error: 'bad_key' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      await this.state.storage.put(key, typeof value === 'string' ? value : String(value ?? ''));
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }
}