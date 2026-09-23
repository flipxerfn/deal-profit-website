# Deal Profit — Penny CPU Spotlight + "1M×" Spectacular Polish (Design Spec)

Date: 2026-09-22
Status: Approved in conversation (2026-09-22) — user chose "keep RTX 5060 PC in the hero skip; CPU leads
the finds grid + /deals instead"
Routes affected: `/`, `/deals` (Home. Latest-finds grid, Deals page), shared `DealCard`, `Layout`
Stack: React 19 + Vite 8 + Tailwind v4 (CSS-first) + react-router v7 + framer-motion (existing dep) +
Cloudflare Worker backend (untouched)

## Goal

Give the Penny CPU (user's `~/Videos/Screenshot from 2026-09-19 20-55-44.png`) a real product spotlight:
it becomes an actual deal with its own image, leads the "Latest finds" grid on the homepage and tops the
`/deals` feed, and the whole site gets another layer of polish ("make it soooo amazing") with zero new
dependencies, zero worker/admin changes, and every QA gate green. The hat picture
(`~/Videos/Screenshot from 2026-09-19 20-56-12.png`) is excluded — it must not appear anywhere on the site.

## Approved decisions (from conversation)

- **Hero stays as the RTX 5060 Gaming PC** card on `/`. The Penny CPU is showcased via:
  1. First card in Home's "Latest finds" grid (with a spotlight card treatment),
  2. A wide `SpotlightDeal` banner at the top of `/deals`,
  3. First entry in the live ticker (TICKER = DEALS order).
- **Penny CPU is a real deal**, replacing the current generic `penny-deals` placeholder card (which has
  `image: null` and a Discord CTA). Deal count stays exactly 3 → QA's `Showing 3 of 3` keeps passing.
- **Hat picture: never used**. File left untouched on disk (user can ask for deletion separately).
- All purchase CTAs keep `https://whop.com/deal-profit-6dcc?a=phillipkuz9`; Discord invite stays
  `https://discord.gg/dealprofit`.
- No new heavyweight dependency sets; extend the existing ui kit + framer-motion already in the repo.

## 1. Content changes (`src/data/deals.js`)

- New deal `penny-cpu`:
  - `id: 'penny-cpu'`, `category: 'penny'`, `categoryLabel: 'Penny Deals'`, `badge: 'Penny find'`
  - `price: 0.01`, `referencePrice: 299.99` (→ renders the "100% off" glow badge + Save 100%)
  - `title: 'Penny CPU'`, `imageAlt: 'Penny CPU deal caught at $0.01'`
  - `description`: "A brand-new desktop CPU caught at a penny — a retailer price error posted the
    moment it went live. First come, first served." (User may supply the exact chip model at spec
    review — swap in if provided.)
  - `image`: `src/assets/crops/cpu-card.webp` — 16:9 clean crop (622×349, 0 stray text confirmed via
    OCR, dark bg matching site theme) of the user-approved source (`~/Videos/Screenshot from
    2026-09-19 20-55-44.png`); `imagePosition: 'center'`
  - `meta: ['Live now', 'Save 100%', 'Found by Deal Profit']`
  - `cta: { label: 'View Deal', href: 'https://whop.com/deal-profit-6dcc?a=phillipkuz9' }`
- **Ordering**: `DEALS = [penny-cpu, rtx-5060-gaming-pc, wireless-headphones]`.
  `HOME_FINDS = DEALS.filter(d => d.id === 'penny-cpu' || d.id === 'rtx-5060-gaming-pc')` → CPU first.
  `TICKER = DEALS` (CPU first — consistent with "showcase first").
- Delete the old `penny-deals` placeholder entry (id, image null, Discord CTA) — replaced by `penny-cpu`
  (Whop CTA). Count stays 3.

## 2. DealCard spotlight treatment (`src/components/DealCard.jsx`)

Add an opt-in `spotlight` prop (default false, so no other usage changes):

- Gradient hairline ring around the card (background-clip border trick, brand→glow).
- Image: slow ken-burns zoom on mount (CSS animation, respects reduced motion).
- Top-left: `Penny find` badge with a subtle pulsing glow; top-right: animated **"100% OFF"** sticker chip.
- Price row: `$0.01` rendered with a scale-in stamp effect; `Save 100%` glow badge.
- A light "shine sweep" passes across the card once on mount (linear-gradient overlay animation).
- No layout-size changes (QA-safe: same paddings/dimensions), hover behavior unchanged.

## 3. SpotlightDeal banner (`/deals`, new small component)

A wide premium banner rendered above the deals feed (below the page header), showing the Penny CPU:
image left / copy right on desktop, stacked on mobile:

- Eyebrow "PENNY FIND — LIVE"; headline CPU title; line "Caught at $0.01 — a retailer pricing error posted
  the second it went live."
- Big `$0.01` price + strike-through reference price + `100% OFF` chip.
- CTA button → Whop affiliate link (btn-primary). Secondary text link → Discord (#dealprofit).
- Image: `cpu-square.webp` (480×480) — square crop of the CPU graphic, shown left of the copy on
  desktop (rounded-2xl, `object-cover`), stacked above on mobile.
- Backdrop: gradient hairline + brand glow wash; reuses existing utilities; no overflow at 390px.

## 4. FOMO "caught" feed (Home hero)

Below the hero card's `LiveTicker`, add `CaughtFeed`: three rotating lines (framer-motion AnimatePresence,
~4.5 s/line) drawn from `DEALS`:

- `Penny CPU — caught 40s ago`
- `RTX 5060 Gaming PC — caught 2m ago`
- `Wireless Headphones — caught 6m ago`

Static strings, deterministic (no timers/backend). Respects reduced motion (renders first line only,
no animation).

## 5. Micro-motion (`src/components/Layout.jsx`, `Navbar.jsx`)

- **Scroll progress bar**: fixed 2 px gradient bar (brand→glow) at the very top (z-50), width driven by
  framer-motion `useScroll` (`scaleX`). Hidden via reduced motion → static full-width transparent.
- **Navbar scroll state**: once `scrollY > 12`, add stronger glass background + hairline bottom border +
  subtle shadow (existing glass utilities); otherwise transparent. No layout shift.
- **Route-change fade-in**: the Layout `Outlet` is wrapped in a `motion.div` keyed by
  `location.pathname` (fade-in opacity 0 → 1, ~0.25 s). No exit animation (avoids lazy/Suspense and focus
  pitfalls). Respects reduced motion.

## 6. Performance

- CPU card crop exported as WebP (~20–45 KB) with PIL/ffmpeg (`decoding="async"` already on DealCard img;
  `loading="lazy"` in grids). Hero RTX image untouched.
- No new dependencies; main bundle stays flat (only added ~2 KB of markup/components).

## 7. QA gates (identical to the premium-evolution round)

1. `npm run build` — 0 errors.
2. `npm run lint` — 0 errors (pre-existing warnings acceptable).
3. Worker tests — 45/45 (worker untouched; verify only the run happens).
4. `node playwright/final-qa-premium.mjs` — all geometry checks (7 routes × 4 viewports), interactions,
   incl. deals `Showing 3 of 3` and `matching "rtx"` still passing.
5. Commit + push to `main` → Cloudflare Workers Builds deploy.
6. Prod verify: `node playwright/verify-prod-premium.mjs` (fresh session) + live-whop-check (affiliate
   links live, old links absent).
7. Spot-check `/` and `/deals` screenshots at 1440/390 for the CPU spotlight (no overlap/h-scroll).

## Non-goals

- No worker/`parseDeals.js` changes (domain skip-filter untouched).
- No admin-panel changes; no auth/token/settings changes.
- No new dependencies installed.
- Hat file not deleted.
- Hero card on `/` remains the RTX 5060 Gaming PC (per user's choice).