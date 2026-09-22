# Deal Profit — Premium Website Evolution (Design Spec)

Date: 2026-09-22
Status: Approved (in conversation, 2026-09-22) — user delegated remaining decisions
Routes affected: `/`, `/deals`, `/reviews`, `/upgrade`, `/trial`, `/discord`, `/admin`
Stack: React 19 + Vite 8 + Tailwind v4 (CSS-first) + react-router v7 + framer-motion + Cloudflare Worker backend

## Goal

Make Deal Profit read as a premium SaaS/community product: dark luxury background, pink/red/purple
brand accents, glass effects, subtle gradients, premium cards, smooth animations, consistent
typography and spacing — with the same functionality and no regressions. Verified visually on
desktop/tablet/mobile and deployed to production.

## Approved decisions

- **Display font**: Space Grotesk for headings; Inter remains the body font.
- **Premium pricing**: $25.00/month with a free-trial message ("Start free — $25/mo after",
  "Cancel anytime"). All purchase CTAs continue to link to `https://whop.com/deal-profit-6dcc/price-error-66`.
- No new heavyweight dependency sets (no Radix/shadcn package install); the existing shadcn-style ui
  kit is extended instead.

## 1. Global design system

- Load Space Grotesk (400–700) via Google Fonts alongside Inter. `--font-display` token.
- Headings: Space Grotesk, stronger hierarchy, `tracking-tight`, `text-balance` on headlines.
- Body: Inter, `text-pretty`, refined line-heights.
- New CSS utilities:
  - `.glass` / `.glass-strong` — translucent fill + backdrop-blur + hairline border.
  - `.noise` — subtle SVG-feel texture overlay for depth.
  - Gradient hairline borders for premium cards (background-clip trick).
  - Glow/shadow scale consistency.
  - `.kbd` — keyboard-shortcut hint chip.
- New shared components in `src/components/ui/` (exported from `ui/index.js`):
  - `SectionHeader` — eyebrow + title + description + optional action; `align` prop (left/center).
  - `FeatureCard` — icon + title + text + hover glow.
  - `StatCard` — icon + value + label.
  - `CTASection` — premium gradient promo band with actions.
  - `Accordion` / `AccordionItem` — animated FAQ (framer-motion AnimatePresence).
  - `RatingBars` — 5→1 star distribution bars (Reviews).
  - `Avatar` upgrade — gradient ring + initials fallback.
- Scroll restoration on route change (scroll-to-top in `Layout`).

## 2. Navbar + Footer

- Navbar: glassier (deeper blur + gradient hairline), CTA renamed "Get Premium" (crown icon),
  active link glow pill, mobile menu keeps CTA.
- Footer: multi-column (brand blurb + social actions, Browse, Membership, bottom bar).

## 3. Homepage

- Hero: animated gradient orbs + grid pattern; staggered headline reveal (respects reduced motion);
  dual CTAs; trust stats; right-side premium deal card with a live-ticker strip of 3 mini deals.
- New "How it works" section (3 numbered steps).
- "What We Hunt" rebuilt on `FeatureCard` + `SectionHeader`.
- Latest finds uses upgraded `DealCard`.
- Community proof: animated stats band + 2-card review preview.
- Final CTA via `CTASection`.

## 4. Deals

- Search: `/` focuses, `Esc` clears, kbd hint, "Showing N of M" count.
- Category chips: sliding active pill (`layoutId`), per-category counts.
- Refresh: spin + "Updated just now · auto-refreshes every 2 min".
- Loading via `SkeletonCard`; improved empty/no-results states.

## 5. Reviews

- Rating distribution bars; polished summary card.
- Review cards: gradient avatar ring, "Verified review" shield badge, hover lift.
- Form/submission flow unchanged functionally.

## 6. Upgrade

- Pricing card: **$25/month**, free-trial messaging, featured vs free comparison, Whop CTA.
- Benefits grid on `FeatureCard`s; comparison gets glow treatment; FAQ accordion (4 items);
  final CTA via `CTASection`.

## 7. Trial + Discord

- Trial: free-trial checklist, cleaner copy, unified CTA.
- Discord: screenshot hover zoom + gradient overlay, avatar-stack social strip, `StatCard` stats,
  blurple-accent CTA.

## 8. Admin

- UI-only polish: glass login card, dashboard on real `Card`/`StatCard`, segmented tabs, consistent
  buttons/inputs. No API/functionality changes.

## 9. Performance

- Optimize images: logo 1254×1254 / 944 kB → ~256px WebP/PNG (~15–20 kB); screenshots → WebP with
  correct render aspect (expected ~400 kB total image weight, down from ~2.3 MB).
- `React.lazy` the Admin route + Suspense fallback.
- `decoding="async"`, explicit image dimensions (CLS).

## 10. QA + deployment

- Playwright: all 6 public routes × 1440/1280/1024/390 (no overflow, no console errors, buttons
  never wrap) + interactions (search `/`, filters, review submit, mobile menu, admin login).
- `npm run build`, `npm run lint`, `node --test worker/*.test.js` (45 tests).
- Commit → push `main` → verify fresh build served at https://goosiev.com via Playwright.

## Out of scope

- Worker behavior changes (feed parsing, dedupe, auth, review storage, admin endpoints).
- Business content that does not exist (real review content stays whatever the API returns).
- Installing Radix/shadcn packages.