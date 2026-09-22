# Deal Profit — Deal-Finding Community Website

A dark, scannable website for Deal Profit — a price error, penny deal and glitch-finding Discord community.

## Pages

- `/` — Home: animated hero with live ticker, how it works, what we hunt, latest finds, live review preview, community stats
- `/deals` — Live deal feed (Discord-backed) with keyboard search (`/`, `Esc`), category chips with counts, sorting and refresh feedback
- `/reviews` — Community reviews with rating distribution, featured review and a submit form (approval flow in the Worker)
- `/upgrade` — Premium page: $25/mo pricing card (free trial messaging), benefits, free-vs-premium comparison and FAQ
- `/trial` — Membership / free trial page with what's-included checklist
- `/discord` — Community page with Discord screenshots, stats and a blurple join CTA

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/index.css`)
- **Fonts**: Space Grotesk (display), Inter (body) — loaded in `index.html`
- **Icons**: React Icons
- **Routing**: React Router v7
- **Animation**: Framer Motion (respects `prefers-reduced-motion` via `src/lib/motion.js`)
- **Deployment**: Cloudflare Workers (static assets + Worker API)

## Design system

- `src/components/ui/` — shared kit: `SectionHeader`, `FeatureCard`, `StatCard`, `CTASection`, `Accordion` (FAQ), `RatingBars`, `Badge`, `Card`, `Avatar`, form controls, `SkeletonCard`. No external UI dependency — extend the kit rather than adding a library.
- `src/index.css` — `@theme` design tokens (`brand`, `glow`, `charcoal`, `night`, fonts) plus layered utilities: `.glass`, `.glass-strong`, `.card`, `.btn`, `.chip`, `.badge`, `.kbd`, `.noise`, `.text-gradient-brand`, `.text-shadow-glow`, `.hairline-gradient`.
- Assets are WebP (screenshots/cards) with the logo downscaled in place; `/admin` is lazy-loaded so public pages ship a leaner bundle.

## Development

```bash
npm install
npm run dev       # start frontend dev server
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint      # oxlint

npm run build && npx wrangler dev   # full stack: SPA + /api/deals
```

## Structure

- `src/routes/` — page components (Home, Deals, Reviews, Trial, Discord, Upgrade, Admin + `admin/` tabs)
- `src/components/` — shared UI (Navbar, Footer, Layout, DealCard)
- `src/components/ui/` — shared design-system kit (cards, headers, badges, form controls, etc.)
- `src/data/deals.js` — deal data, separate from presentation
- `src/index.css` — Tailwind v4 entry: design tokens (`@theme`) plus layered components
- `worker/` — Cloudflare Worker: `index.js` (routing, Discord feed + admin API), `auth.js` (session signing/cookies), `parseDeals.js` (message → deal parser), `reviews.js` (review shape + validation)
- `public/` — static assets (favicon, etc.)

## Live Discord Deal Feed

`/deals` pulls real posts from your Discord server through a Cloudflare Worker at `GET /api/deals`. The bot token is held server-side only — it never ships to the browser. Manual deals entered in the admin panel are merged into the same feed.

### How it works

- `wrangler.toml` sets `main = ./worker/index.js` and routes `/api/*` through the Worker (`run_worker_first`), everything else stays static assets with SPA fallback.
- The Worker discovers guilds the bot belongs to, lists text channels (type 0 and 5) inside the configured **categories**, fetches the latest messages (`limit=50`, newest-first), normalizes them into deal cards (`worker/parseDeals.js`), and merges any manual deals on top.
- Responses are cached in-module for 60s plus served with `Cache-Control: public, s-maxage=60` at the edge, so Discord is rarely hit.
- When Discord credentials are missing the API reports `configured: false`; when Discord is unreachable but manual deals exist they are still served.

### Configuration

1. Create a Discord bot at <https://discord.com/developers/applications>, add it to your server, and give it permission to read message history in the deal channels.
2. Turn on **Developer Mode** in Discord, right-click each deal **category** → Copy Category ID.
3. Configure the values (the token is a **secret**, the category IDs are not):
   - Local dev: copy `.dev.vars.example` → `.dev.vars` and fill it in (never commit `.dev.vars`).
   - Production (Cloudflare dashboard, Settings → Variables and Secrets): `DISCORD_BOT_TOKEN` as a **secret**, `DISCORD_CATEGORY_IDS` as a variable (comma-separated IDs). Or via CLI: `npx wrangler secret put DISCORD_BOT_TOKEN` and `npx wrangler deploy --var DISCORD_CATEGORY_IDS:111111111111,222222222222`.

The parser is built to be tolerant of common post formats (plain text, embeds, attachments, strikethrough/was-prices) and skips non-deal messages. If your channel posts in a distinct format, tighten `worker/parseDeals.js` and add cases to your sample tests.

## Admin Panel (`/admin`)

A hidden private page (no public links) at `/admin`.

- **Login**: username + password. Auth is server-side: `ADMIN_USERNAME` (default `goosievv`) and `ADMIN_PASSWORD` from the Workers env. Successful login sets an `HttpOnly; SameSite=Strict` session cookie that expires after 8 hours; failed logins are rate-limited.
- **Dashboard**: Discord connection state, configured categories (masked), discovered channels, deal counts, last sync and the last (sanitized) error, plus a “Sync now” button.
- **Settings**: set the Discord bot token (write-only — it is saved server-side and never shown again) and the category IDs. Values entered here override the environment variables.
- **Manual deals**: create, edit (title, link, image, prices, category, shop, description) and delete manual deals. They appear on `/deals` alongside the Discord feed.

Every `/api/admin/*` endpoint except login verifies the session cookie; mutating endpoints also verify the request origin. No secret value (bot token, admin password) ever appears in an API response, the HTML, or the JavaScript bundle.

### Persistent storage

Admin settings and manual deals are stored server-side in a **Durable Object** (`DEAL_STORE`), bound in `wrangler.toml` and deployed automatically with the Worker — no dashboard setup needed. It survives Worker restarts and is shared across all isolates, so the admin panel's config and manual deals persist reliably. Without the binding (local dev/tests) the Worker falls back to in-memory storage, which is fine but resets on restart.

## Customization

1. Edit page text in `src/routes/`
2. Add/edit fallback deals in `src/data/deals.js`
3. Adjust brand tokens (colors, shadows) in the `@theme` block of `src/index.css`
4. Update the Whop and Discord invite links wherever you see them
5. Premium pricing copy ("Start free — pay $25/month after", "Cancel anytime") lives on `/upgrade` and `/trial`; the switchable fonts are in `index.html`
6. Extend the design system by adding components to `src/components/ui/` and exporting from its `index.js`

## Deployment

Cloudflare Workers (Git-connected) — build command `npm run build`, static assets from `dist`, Worker entry `worker/index.js` (per `wrangler.toml`).