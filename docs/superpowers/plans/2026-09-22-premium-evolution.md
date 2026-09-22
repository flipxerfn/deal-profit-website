# Deal Profit — Premium Website Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Deal Profit site into a premium SaaS/community product — Space Grotesk display typography, glass/depth utilities, a unified component library, redesigned routes, and real performance wins — without breaking any functionality, then deploy and verify live.

**Architecture:** Extend the existing Tailwind v4 CSS-first design system and the existing shadcn-style ui kit (no new dependency sets). Foundation-first sequencing: (1) design tokens + utilities, (2) shared components, (3) chrome (navbar/footer/layout), (4) routes build on those, (5) assets/performance, (6) QA, (7) deploy. Worker (`worker/index.js`) and all API behavior are untouched; admin receives UI-only polish.

**Tech Stack:** React 19, Vite 8, Tailwind CSS v4 (CSS in `src/index.css`), react-router-dom v7, framer-motion v13, react-icons, Cloudflare Worker backend.

**Spec:** `docs/superpowers/specs/2026-09-22-premium-evolution-design.md`

## Global Constraints

- Display font: **Space Grotesk** (headings) + Inter (body). Load both via Google Fonts.
- Premium pricing copy is **$25.00/month**, always paired with free-trial messaging ("Start free — pay $25/mo after", "Cancel anytime").
- All purchase CTAs keep `https://whop.com/deal-profit-6dcc?a=phillipkuz9` (TRIAL_URL in codebases is already this).
- Discord invite keeps `https://discord.gg/dealprofit`.
- No new npm dependencies. No Radix/shadcn package installs. Use the existing ui kit.
- Worker tests must stay 45/45 passing. `npm run build` and `npm run lint` must pass.
- No horizontal scroll at 1440/1280/1024/390. Buttons must never wrap to two lines.
- `prefers-reduced-motion` must disable all motion (existing `useReducedMotion` + `getMotionProps` pattern).

## Review Focus

- **Search input focus conflicts:** pressing `/` while typing in another input must not hijack the keystroke; `Esc` must not close the page or blur unexpectedly. Behavior: `/` focuses search only when no input/textarea/select is focused; `Esc` clears the query and refocuses the search box.
- **Animated navigation indicator on resize/route change:** must never be visible at a wrong position or NaN width (it tracks via DOM measurement). Behavior: indicator hides (opacity 0) when no active link is measurable.
- **Admin route lazy-load:** must render a styled fallback, not a white flash, and must not delay the first paint of public pages.
- **Image swaps:** imported asset paths must exist after optimization or the build fails loudly — QA must re-run `build` after every asset replacement and confirm no broken imports.
- **Empty/live feed states on /deals:** with no worker in local dev the page shows sample data + notice banner; with a live worker it shows live data. Both must render identically well ("Showing N of M" must handle 0 results without a divide-by-zero or "of 0" weirdness).

---

### Task 1: Design tokens + global utilities (foundation)

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

**Interfaces:**
- Produces: `font-display` utility class; `.glass`, `.glass-strong`, `.noise`, `.kbd`, `.text-shadow-glow`, `.hairline-gradient` utilities available to all later tasks.

- [ ] **Step 1: Add Space Grotesk + meta polish to `index.html`**

Replace the font `<link>` block with both families and add a theme-color tweak if needed:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Add font token + base heading rules to `src/index.css`**

In `@theme`, add:

```css
--font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
```

In `@layer base`, add heading defaults with `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs:

```css
h1, h2, h3, h4 { font-family: var(--font-display); text-wrap: balance; }
p { text-wrap: pretty; }
input, button, textarea, select { font-family: var(--font-sans); }
```

- [ ] **Step 3: Add component utilities**

In `@layer components`, append:

```css
.glass {
  @apply border border-white/10 bg-white/[0.03] backdrop-blur-md;
}
.glass-strong {
  @apply border border-white/15 bg-charcoal/70 backdrop-blur-xl;
}
.kbd {
  @apply inline-flex h-5 min-w-5 items-center justify-center rounded border border-white/15 bg-white/5 px-1.5 font-sans text-[10px] font-semibold text-zinc-400;
}
```

In `@layer utilities`, append:

```css
.noise {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E");
}
.text-shadow-glow { text-shadow: 0 0 32px rgba(244, 63, 94, 0.35); }
.hairline-gradient { background-image: linear-gradient(90deg, transparent, rgba(244,63,94,0.5), rgba(139,92,246,0.5), transparent); }
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: builds clean; CSS grows by roughly the new utility weight.

- [ ] **Step 5: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: add Space Grotesk display font + glass/noise/kbd utilities"
```

---

### Task 2: Extend the ui kit with shared components

**Files:**
- Create: `src/components/ui/SectionHeader.jsx`
- Create: `src/components/ui/FeatureCard.jsx`
- Create: `src/components/ui/StatCard.jsx`
- Create: `src/components/ui/CTASection.jsx`
- Create: `src/components/ui/Accordion.jsx`
- Create: `src/components/ui/RatingBars.jsx`
- Modify: `src/components/ui/Avatar.jsx` (gradient-ring upgrade)
- Modify: `src/components/ui/index.js` (export new components)

**Interfaces:**
- Produces:
  - `SectionHeader({ eyebrow, title, description, align = 'left', actions, className })`
  - `FeatureCard({ icon: Icon, title, text, className })`
  - `StatCard({ icon: Icon, value, label, className })`
  - `CTASection({ eyebrow, title, description, actions, className })`
  - `Accordion({ items: [{ title, content }], className })` (single-open toggle)
  - `RatingBars({ distribution: [{ stars, count, pct }] })`
  - Upgraded `Avatar` — accepts `children` fallback with gradient ring (`ring-2 ring-brand/40` + gradient glow), same API otherwise.

- [ ] **Step 1: `SectionHeader.jsx`**

```jsx
import { clsx } from 'clsx';

export default function SectionHeader({ eyebrow, title, description, align = 'left', actions, className = '' }) {
  const center = align === 'center';
  return (
    <div className={clsx('mb-8', center && 'text-center', className)}>
      {eyebrow && (
        <p className={clsx('text-xs font-semibold uppercase tracking-wider text-brand', center && 'mx-auto')}>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
          {title}
        </h2>
      )}
      {description && (
        <p className={clsx('mt-3 max-w-2xl text-base leading-relaxed text-zinc-400', center && 'mx-auto')}>
          {description}
        </p>
      )}
      {actions && <div className={clsx('mt-5', center && 'flex justify-center')}>{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: `FeatureCard.jsx`**

```jsx
import { clsx } from 'clsx';

export default function FeatureCard({ icon: Icon, title, text, className = '' }) {
  return (
    <div className={clsx('card card-hover group relative overflow-hidden p-5 sm:p-6', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
      <div className="relative mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand shadow-[0_0_16px_rgba(244,63,94,0.2)] transition-all duration-300 group-hover:bg-brand/20 group-hover:shadow-[0_0_24px_rgba(244,63,94,0.35)]">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="relative text-sm font-bold text-white">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
    </div>
  );
}
```

- [ ] **Step 3: `StatCard.jsx`**

```jsx
import { clsx } from 'clsx';

export default function StatCard({ icon: Icon, value, label, className = '' }) {
  return (
    <div className={clsx('card relative overflow-hidden p-5 text-center', className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
      <div className="relative mx-auto mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <p className="relative text-2xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="relative mt-0.5 text-xs text-zinc-400">{label}</p>
    </div>
  );
}
```

- [ ] **Step 4: `CTASection.jsx`**

```jsx
import { clsx } from 'clsx';

export default function CTASection({ eyebrow, title, description, actions, className = '' }) {
  return (
    <section className={clsx('relative mt-12 overflow-hidden rounded-xl border border-brand/20 p-8 md:mt-16 md:p-12', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_160%_at_20%_0%,rgba(244,63,94,0.22),rgba(139,92,246,0.12)_50%,transparent_80%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.1),transparent_70%)]" aria-hidden="true" />
      <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-xl">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">{eyebrow}</p>}
          {title && <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h2>}
          {description && <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-col gap-3 sm:flex-row">{actions}</div>}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: `Accordion.jsx`** (framer-motion height animation, `AnimatePresence`)

```jsx
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaChevronDown } from 'react-icons/fa';
import { clsx } from 'clsx';
import { useReducedMotion } from '../../lib/motion';

export default function Accordion({ items = [], className = '' }) {
  const [open, setOpen] = useState(null);
  const prefersReduced = useReducedMotion();
  return (
    <div className={clsx('space-y-3', className)}>
      {items.map((item, i) => {
        const isOpen = open === i;
        const id = `acc-${i}`;
        return (
          <div key={id} className={clsx('card overflow-hidden transition-colors duration-200', isOpen && 'border-brand/30')}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              aria-controls={`${id}-panel`}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-bold text-white">{item.title}</span>
              <FaChevronDown className={clsx('h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform duration-200', isOpen && 'rotate-180 text-brand')} />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${id}-panel`}
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-400">{item.content}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 6: `RatingBars.jsx`**

```jsx
import { clsx } from 'clsx';

export default function RatingBars({ distribution = [] }) {
  if (!distribution.length) return null;
  return (
    <div className="space-y-2" aria-label="Rating distribution">
      {distribution.map((row) => (
        <div key={row.stars} className="flex items-center gap-3 text-xs">
          <span className="w-8 shrink-0 font-semibold text-zinc-400">{row.stars}★</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
            <div className={clsx('h-full rounded-full bg-gradient-to-r from-brand to-glow-2')} style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }} />
          </div>
          <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500">{row.count}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Upgrade `Avatar.jsx`** — gradient ring around initials

Change the fallback branch:

```jsx
) : (
  <div className={clsx('relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-brand/25 via-charcoal-3 to-glow/30 font-bold text-white ring-2 ring-brand/40', sizes[size])}>
    <span className={clsx('absolute inset-0 rounded-full bg-gradient-to-br from-brand/30 to-glow/30 blur-sm opacity-60', '-z-10')} aria-hidden="true" />
    {children}
  </div>
) }
```

(Belongs inside the `Avatar` component; keep the same exported names.)

- [ ] **Step 8: Export from `src/components/ui/index.js`**

Add:

```js
export { default as SectionHeader } from './SectionHeader';
export { default as FeatureCard } from './FeatureCard';
export { default as StatCard } from './StatCard';
export { default as CTASection } from './CTASection';
export { default as Accordion } from './Accordion';
export { default as RatingBars } from './RatingBars';
```

- [ ] **Step 9: Verify**

Run: `npm run build && npm run lint`
Expected: clean build; oxlint reports no new issues (check unused-vars etc.).

- [ ] **Step 10: Commit**

```bash
git add src/components/ui
git commit -m "feat: shared SectionHeader, FeatureCard, StatCard, CTASection, Accordion, RatingBars + Avatar ring"
```

---

### Task 3: Layout scroll restoration + Navbar + Footer

**Files:**
- Modify: `src/components/Layout.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/components/Footer.jsx`

**Interfaces:**
- Produces: `Layout` scrolls to top on route change (reads `useLocation().pathname`); navbar keeps exact 6 links + CTA; footer keeps all existing links.
- Consumes: `motionVariants`/`getMotionProps` from `src/lib/motion.js` (existing).

- [ ] **Step 1: Scroll restoration in `Layout.jsx`**

```jsx
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
// ...existing imports...
const { pathname } = useLocation();
useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [pathname]);
```

Also bump the backdrop glows slightly (keep them). `html` already has `scroll-behavior: smooth`; use `window.scrollTo(0,0)` (instant) to avoid animation fights on route change.

- [ ] **Step 2: Navbar glass upgrade**

- Header: change to `border-b border-white/10 bg-night/60 backdrop-blur-xl` and add a `hairline-gradient` strip: `<div className="hairline-gradient absolute inset-x-0 bottom-0 h-px opacity-40" aria-hidden="true" />` (header must be `relative overflow-hidden`? — use `relative`, no overflow-hidden so the mobile drawer can render).
- Keep the existing measured active indicator (indicatorRef logic) but restyle: keep width/translate tracking; height `h-0.5`, `bg-gradient-to-r from-brand to-glow`, plus `shadow-[0_0_12px_rgba(244,63,94,0.6)]`.
- On route change the indicator must update: add `pathname` to the effect deps and re-run `update()`.
- Secondary CTA button text: `Start Free Trial` → `Get Premium` with `FaCrown` icon (`react-icons/fa`). Mobile drawer CTA mirrors it.

- [ ] **Step 3: Footer multi-column**

Replace `Footer.jsx` body with a 4-zone grid:

```jsx
<footer className="border-t border-white/10 bg-charcoal/40">
  <div className="mx-auto max-w-[1152px] px-4 py-12 sm:px-6 lg:px-8">
    <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
      {/* Brand */}
      <div>
        <div className="flex items-center gap-2.5">
          <img src={dealProfitLogo} alt="" className="h-7 w-auto" />
          <span className="text-sm font-bold text-white">Deal<span className="text-brand">Profit</span></span>
        </div>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
          Price errors, penny deals and profitable finds — posted the moment they go live.
        </p>
        <a href="https://discord.gg/dealprofit" target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-5 text-xs">
          <FaDiscord className="text-sm" /> Join Discord
        </a>
      </div>
      {/* Browse column */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Browse</p>
        <nav className="mt-4 flex flex-col gap-2.5 text-sm">
          <Link to="/" className="text-zinc-400 hover:text-white transition-colors">Home</Link>
          <Link to="/deals" ...>Deals</Link>
          <Link to="/reviews" ...>Reviews</Link>
        </nav>
      </div>
      {/* Membership column */}
      <div>
        <p ...>Membership</p>
        <nav className="mt-4 flex flex-col gap-2.5 text-sm">
          <Link to="/trial" ...>Free Trial</Link>
          <Link to="/upgrade" ...>Upgrade</Link>
          <a href={WHOP_URL} target="_blank" ...>Whop Store</a>
        </nav>
      </div>
      {/* Community column */}
      <div>
        <p ...>Community</p>
        <nav className="mt-4 flex flex-col gap-2.5 text-sm">
          <Link to="/discord" ...>Discord</Link>
          <a href="https://discord.gg/dealprofit" ...>Invite Link</a>
          <a href="/admin" className="text-zinc-600 hover:text-zinc-400 ...">Admin</a>
        </nav>
      </div>
    </div>
    <div className="mt-10 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
      <p>© 2026 Deal Profit. All rights reserved.</p>
      <p>Deals are not guaranteed and can be corrected by retailers at any time.</p>
    </div>
  </div>
</footer>
```

(Import `FaDiscord` and define `WHOP_URL` const like Navbar does.)

- [ ] **Step 4: Verify**

Run: `npm run build && npm run lint`
Then spot-check with dev server: `npm run dev` background, visit `http://localhost:5173/`, assert navbar still shows logo + 6 links + CTA, and navigate to `/deals` to confirm scroll-to-top works (metrics script: `window.scrollY === 0` after nav).

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.jsx src/components/Navbar.jsx src/components/Footer.jsx
git commit -m "feat: glass navbar with gradient indicator, multi-column footer, scroll restoration"
```

---

### Task 4: Homepage redesign

**Files:**
- Modify: `src/routes/Home.jsx`
- Modify: `src/components/DealCard.jsx` (minor: meta pulse dots, image polish)
- Modify: `src/data/deals.js` (add `HOW_IT_WORKS` + `COMMUNITY_STATS` data)

**Interfaces:**
- Consumes: `SectionHeader`, `FeatureCard`, `StatCard`, `CTASection`, `Badge`, `buttonClass`, `DealCard`, `motion`/`useReducedMotion`.
- Produces: The rebuilt homepage. `Counter` local component (inline in Home.jsx) using `framer-motion`'s `animate` + `useInView`.

- [ ] **Step 1: Add data to `src/data/deals.js`**

```js
export const HOW_IT_WORKS = [
  { step: '01', title: 'Join the community', text: 'Hop into the Deal Profit Discord and grab the free trial to unlock member-only channels.' },
  { step: '02', title: 'Get real-time alerts', text: 'Price errors, penny finds and glitches are posted the second they go live in your feed and Discord.' },
  { step: '03', title: 'Catch the deal first', text: 'Check the listing fast, lock in the price and resell or keep the savings — before everyone else.' },
];

export const COMMUNITY_STATS = [
  { value: '10K+', label: 'Deal hunters', icon: 'users' },
  { value: '50+', label: 'Deals posted daily', icon: 'bolt' },
  { value: '93%', label: 'Average savings', icon: 'percent' },
  { value: '24/7', label: 'Live alerts', icon: 'bell' },
];
```

(Icon mapping stays in the component via a local `STAT_ICONS` record — keep `deals.js` icon-free.)

- [ ] **Step 2: Rebuild hero in `Home.jsx`**

- Keep the existing two-column grid (`lg:grid-cols-[1fr_0.9fr]`).
- Left column: keep badges row, headline (add `font-display` + `text-balance` + staggered word reveal using SplitText-style: split headline into words mapped to `motion.span` with `staggerChildren`; wrap each word; reduced-motion renders plain), description, CTA row, trust stats.
- Right column: keep the premium deal card, then add a **live ticker** beneath it inside the same card shell — 3 rows from `HOME_FINDS`/`DEALS`:

```jsx
<div className="mx-2 mb-2 border-t border-white/10 px-1 pt-3">
  <div className="space-y-2">
    {TICKER.map((deal) => (
      <div key={deal.id} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{deal.title}</p>
          <p className="text-[11px] text-zinc-500">{deal.categoryLabel} · live now</p>
        </div>
        <span className="shrink-0 text-sm font-bold text-brand">{deal.displayPrice || `$${deal.price.toFixed(2)}`}</span>
      </div>
    ))}
  </div>
</div>
```

Use reduced-motion-safe ping (existing `prefersReduced` gate or CSS-only class — animate-ping is fine as static fallback under reduced motion via the global CSS rule).

- [ ] **Step 3: Add "How it works" section**

After hero, before "What We Hunt":

```jsx
<section className="pb-4" aria-labelledby="how-title">
  <SectionHeader align="center" eyebrow="How it works" title="From find to profit in three steps" description="No paid bot subscriptions, no resellers farming referrals. Just fast, verified deal alerts." />
  <div className="grid gap-4 sm:grid-cols-3 stagger-container">
    {HOW_IT_WORKS.map((item) => (
      <div key={item.step} className="card card-hover relative overflow-hidden p-6">
        <span className="text-stroke-brand pointer-events-none absolute -top-2 right-3 text-6xl font-extrabold text-transparent" aria-hidden="true">{item.step}</span>
        <h3 className="text-sm font-bold text-white">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.text}</p>
      </div>
    ))}
  </div>
</section>
```

Wrap the grid in `motion.div` with `staggerContainer` and each card in `motion.div` with `staggerItem`.

- [ ] **Step 4: Rebuild "What We Hunt" + "Latest finds" + proof + final CTA**

- "What We Hunt": replace the 4 hand-rolled cards with `<SectionHeader eyebrow="What we hunt" title="..." description="..." align="center" />` + `FeatureCard` grid (icons mapped by index from `HUNT_ICONS`).
- "Latest finds": keep, but render `DealCard` grid (already `staggerContainer`).
- Community proof section: `SectionHeader` + a **stats band** (`COMMUNITY_STATS` via `StatCard`, wrapped in motion) + `ReviewPreview` mini-grid: two static premium quote cards (`FaQuoteLeft`, 5 stars, `Avatar`, "Verified member" line) + "Read all reviews" link to `/reviews`.
- Final CTA: replace hand-rolled block with `<CTASection title="Never miss a deal again." description="..." actions={[primary Discord CTA, outline Trial CTA]} />`.

- [ ] **Step 5: `DealCard.jsx` polish**

Swap the meta bullet (`h-1 w-1 rounded-full bg-brand/70`) to a small pulse dot for "Live now" items; keep everything else identical.

- [ ] **Step 6: Verify**

Run: `npm run build && npm run lint`
Run playwright metrics: every viewport on `/` → assert no horizontal scroll, hero card bottom < "How it works" top, and no element overlaps (`document.elementFromPoint` sampling of the hero card region).

- [ ] **Step 7: Commit**

```bash
git add src/data/deals.js src/routes/Home.jsx src/components/DealCard.jsx
git commit -m "feat: premium homepage — animated hero, live ticker, how-it-works, stats band, review preview"
```

---

### Task 5: Deals page upgrades

**Files:**
- Modify: `src/routes/Deals.jsx`

**Interfaces:**
- Consumes: existing `Input`, `Select`, `Button`, `Badge`, `SkeletonCard` (import from `../components/ui`).
- Produces: keyboard shortcuts, `Showing N of M` count, per-category counts, sliding active pill.

- [ ] **Step 1: Keyboard shortcuts**

Add a `searchRef` on the `Input`. Add `useEffect`:

```jsx
useEffect(() => {
  const onKey = (e) => {
    const tag = document.activeElement?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    if (e.key === '/' && !typing) {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (e.key === 'Escape' && document.activeElement === searchRef.current) {
      setQuery('');
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
```

Add a `<span className="kbd">/</span>` hint inside the search wrapper (before the clear button, visible when `!query` — replaced by the clear `X` when query is non-empty) and an `aria-describedby`/title "Press / to search".

- [ ] **Step 2: Result count**

After the search/filter row, add:

```jsx
<p className="mb-4 text-xs text-zinc-500" aria-live="polite">
  Showing <span className="font-semibold text-zinc-300">{filtered.length}</span> of <span className="font-semibold text-zinc-300">{feed.deals.length}</span> deals
  {category !== 'all' && ` in ${activeLabel}`}
  {query && ` matching "${query}"`}
</p>
```

- [ ] **Step 3: Category chips with counts + sliding active pill**

```jsx
const counts = useMemo(() => {
  const map = { all: feed.deals.length };
  for (const d of feed.deals) map[d.category] = (map[d.category] ?? 0) + 1;
  return map;
}, [feed.deals]);
```

Render chips inside a `motion.div` (relative) and give the active chip an underline pill:

```jsx
{CATEGORIES.map((cat) => (
  <button key={cat.id} onClick={() => setCategory(cat.id)} className={`chip chip-nowrap relative py-2 pl-3 pr-2.5 ${category === cat.id ? 'chip-active' : 'hover:text-white'}`} aria-pressed={category === cat.id}>
    {category === cat.id && (
      <motion.span layoutId="deal-cat-pill" className="absolute inset-0 rounded-full border border-brand/50 bg-brand/10" transition={{ duration: 0.25 }} aria-hidden="true" />
    )}
    <span className="relative">{cat.label}</span>
    {counts[cat.id] != null && (
      <span className={`relative ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${category === cat.id ? 'bg-brand/25 text-brand-2' : 'bg-white/5 text-zinc-400'}`}>{counts[cat.id]}</span>
    )}
  </button>
))}
```

(Note: `chip` class already sets padding — extend with the count pill; remove `chip-active` bg overlap concerns by layering the motion pill under text via `relative`.)

- [ ] **Step 4: Refresh feedback**

Keep the existing refresh button spinning state. After a successful background refresh, show a one-shot fade message:

```jsx
{refreshing ? ...existing... : lastRefreshed && (
  <span className="text-xs text-zinc-500">Updated {timeAgo(lastRefreshed)} · auto-refreshes every 2 min</span>
)}
```

Track `lastRefreshed` in state, set to `new Date().toISOString()` in `loadFeed` (both branches), reuse the existing `timeAgo` helper.

- [ ] **Step 5: Loading + empty states**

- Replace hand-rolled loading skeleton with `<SkeletonCard />` (loop `[0,1,2]`), wrapped in the same motion grid.
- Empty/no-results states: add a large soft icon (`FaMagnifyingGlass`/`FaTriangleExclamation` already imported) + clearer copy + keep Reset buttons.

- [ ] **Step 6: Verify**

Run: `npm run build && npm run lint`
Playwright interaction check on `/deals` @1440 and @390: type `/` → search focused; type `rtx` → count line changes; press `Esc` → query cleared; click a category chip → pill moves; assert no overflow + no console errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/Deals.jsx
git commit -m "feat: deals page — keyboard search, result count, count chips, refresh feedback"
```

---

### Task 6: Reviews page upgrades

**Files:**
- Modify: `src/routes/Reviews.jsx`

**Interfaces:**
- Consumes: `RatingBars`, upgraded `Avatar`, `Badge`, existing form logic (UNCHANGED submit flow).
- Produces: rating distribution from `state.reviews`, verified-badge styling.

- [ ] **Step 1: Distribution computation**

```jsx
const distribution = useMemo(() => {
  const buckets = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: 0 }));
  for (const r of state.reviews) {
    const b = buckets.find((x) => x.stars === r.rating);
    if (b) b.count += 1;
  }
  const total = buckets.reduce((s, b) => s + b.count, 0);
  return buckets.map((b) => ({ ...b, pct: total ? Math.round((b.count / total) * 100) : 0 }));
}, [state.reviews]);
```

- [ ] **Step 2: Summary block upgrade**

In the existing summary grid, keep the average card, then:
- First card: bigger average (`text-4xl`), stars (`size="text-2xl"`), count line, plus `RatingBars distribution={distribution}` beneath the top row.
- Featured card: keep, but render the featured quote with a `FaQuoteLeft` watermark icon in the corner and the upgraded `Avatar`.

- [ ] **Step 3: Review card polish**

- Avatar usage: `<Avatar size="sm"><span className="text-sm font-bold">{initial}</span></Avatar>` (children now rendered inside gradient ring).
- "Verified review" badge: swap to a shield check — use `FaShieldHalved` (exists in `react-icons/fa6`) + `Badge variant="outline"`.
- Keep all existing structure, `featured` treatment, and hover lift.

- [ ] **Step 4: Verify**

Run: `npm run build && npm run lint`
Playwright: `/reviews` @1440 loads summary + cards (dev falls back? Reviews hits `/api/reviews` → 404 in dev → error state shows. Verify the error state renders cleanly and Retry button works. Full flow verified later in QA with the worker).

- [ ] **Step 5: Commit**

```bash
git add src/routes/Reviews.jsx
git commit -m "feat: reviews — rating distribution bars, gradient avatars, shield verified badge"
```

---

### Task 7: Upgrade page (pricing + FAQ)

**Files:**
- Modify: `src/routes/Upgrade.jsx`

**Interfaces:**
- Consumes: `SectionHeader`, `FeatureCard`, `CTASection`, `Accordion`, `Badge`, `buttonClass`.
- Produces: pricing card text `$25.00/mo` (constant `PRICE = '25'`).

- [ ] **Step 1: Pricing section**

After the hero, add a centered pricing card section:

```jsx
<div className="mx-auto mt-12 max-w-md">
  <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-charcoal p-8">
    <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-glow/10" aria-hidden="true" />
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(244,63,94,0.5)]">
      Deal Profit Premium
    </div>
    <div className="relative text-center">
      <p className="text-5xl font-extrabold tracking-tight text-white">
        $25<span className="text-xl font-bold text-zinc-400">/mo</span>
      </p>
      <p className="mt-2 text-sm text-zinc-400">Start free — pay $25/month after your trial. Cancel anytime.</p>
      <a href={WHOP_URL} target="_blank" rel="noopener noreferrer" className={`${buttonClass({ variant: 'primary', size: 'lg' })} mt-6 w-full`}>
        <FaCrown className="text-sm" /> Start Free Trial
      </a>
      <ul className="mt-6 space-y-2 text-left text-sm text-zinc-300">
        {PRICING_HIGHLIGHTS.map((f) => (
          <li key={f} className="flex items-center gap-2.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand/20 text-brand shadow-[0_0_8px_rgba(244,63,94,0.3)]"><FaCheck className="h-3 w-3" /></span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  </div>
</div>
```

Add `const PRICING_HIGHLIGHTS = ['Faster member-first alerts', 'Price errors & penny finds', 'Premium Discord access', 'Reselling opportunities'];`

- [ ] **Step 2: Benefits grid on `FeatureCard`** — replace `BenefitCard` with `FeatureCard` mapping over existing `BENEFITS`.

- [ ] **Step 3: Comparison upgrade + FAQ**

- Keep the Free/Premium comparison cards but give the Premium card the gradient hairline: `relative card overflow-hidden p-6 sm:p-8` with a top `hairline-gradient h-px` fully across the top edge.
- Add FAQ section under the comparison:

```jsx
const FAQS = [
  { title: 'How does the free trial work?', content: 'Start the free trial through Whop with no commitment. You keep full access until the trial ends, then it converts to the $25/month premium plan unless you cancel.' },
  { title: 'Can I cancel anytime?', content: 'Yes — cancel from your Whop account at any time. Your access stays until the end of the current billing period.' },
  { title: 'What makes the premium feed different?', content: 'Premium members get faster alerts plus priority notifications for price errors, penny deals and reselling opportunities that stay out of the public feed.' },
  { title: 'Are the deals guaranteed?', content: 'No. Retailers can correct pricing errors at any time, and stock is often limited. Deals are posted fast specifically so you can act before that happens.' },
];
```

Render with `SectionHeader align="center"` + `Accordion items={FAQS}` inside `max-w-2xl mx-auto`.

- [ ] **Step 4: Final CTA** — replace bottom block with `<CTASection title="Ready to catch more deals?" description="Start with a free trial or upgrade straight to premium. Cancel anytime." actions={[primary Upgrade, outline Trial]} />`.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run lint`
Playwright `/upgrade` @1440 + @390: pricing card visible, no overflow, FAQ toggles open/close, CTA links point at Whop URL.

- [ ] **Step 6: Commit**

```bash
git add src/routes/Upgrade.jsx
git commit -m "feat: upgrade page — $25/mo pricing card, feature cards, FAQ accordion"
```

---

### Task 8: Trial + Discord pages

**Files:**
- Modify: `src/routes/Trial.jsx`
- Modify: `src/routes/Discord.jsx`

**Interfaces:**
- Consumes: `FeatureCard`, `StatCard`, `CTASection`, `Badge`, `buttonClass`.

- [ ] **Step 1: Trial page**

- Keep hero + trust grid. Add a "What's included" checklist block under the CTA:

```jsx
const TRIAL_INCLUDES = [
  'Instant access to member deal channels',
  'Price error and penny deal alerts',
  'Reselling opportunities from the community',
  'Cancel anytime during the trial',
];
```

Render as a centered `max-w-md` card list with brand check icons, then `CTASection` at the bottom instead of the raw benefit cards + no final CTA. Reuse `BENEFITS` via `FeatureCard`.

- [ ] **Step 2: Discord page**

- Keep hero + stats; rebuild stats grid with `StatCard`.
- Screenshot cards: add gradient overlay on hover (`absolute inset-0 bg-gradient-to-t from-night/70 via-transparent` toggled on group-hover) + keep zoom.
- Add avatar-stack social proof above CTA:

```jsx
<div className="mt-10 flex items-center justify-center gap-3">
  <div className="flex -space-x-3">
    {['PH', 'RK', 'JT', 'MS', 'AL'].map((ini, i) => (
      <Avatar key={ini} size="sm" className={`ring-2 ring-night ${i % 2 ? 'grayscale' : ''}`}> <span className="text-[10px] font-bold">{ini}</span></Avatar>
    ))}
  </div>
  <p className="text-sm text-zinc-400"><span className="font-semibold text-white">10,000+ deal hunters</span> already in the server</p>
</div>
```

- CTA: `CTASection` with a blurple-accented primary action (keep Discord blurple: `background:#5865F2` style-friendly button — use `className={buttonClass({variant:'primary'})}` but override `bg-[#5865F2] hover:bg-[#6b76f3] shadow-[0_0_24px_rgba(88,101,242,0.4)]`).

- [ ] **Step 3: Verify**

Run: `npm run build && npm run lint`
Playwright `/trial`, `/discord` @1440 + @390: no overflow, no wrapped buttons, CTAs correct hrefs.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Trial.jsx src/routes/Discord.jsx
git commit -m "feat: trial checklist + discord social proof and blurple CTA"
```

---

### Task 9: Admin UI polish (functionality preserved)

**Files:**
- Modify: `src/routes/Admin.jsx`
- Modify: `src/routes/admin/AdminSettings.jsx`
- Modify: `src/routes/admin/AdminDeals.jsx`
- Modify: `src/routes/admin/AdminReviews.jsx`

**Interfaces:**
- Consumes: existing `Card`, `Badge`, `buttonClass`/`Button` from ui kit; existing API calls untouched.
- Constraint: **zero changes** to fetch calls, endpoints, auth/session logic, or storage handling.

- [ ] **Step 1: Dashboard**

- Replace the inline `Card` component with ui-kit `Card` + a new local `StatTile` that matches `StatCard` styling but colored by accent prop (reuse pattern, keep icons).
- Discord connection banner: use `glass` + keep the pill styling; add the connection dot pulse when connected.
- Keep `Sync now`, error banner, dashboard stat grid, logout — same handlers.

- [ ] **Step 2: Login**

- Keep exact form/logic; restyle card to `_glass-strong_` + gradient border top (`hairline-gradient h-px`), logo glow (`drop-shadow-[0_0_16px_rgba(244,63,94,0.45)]`), and focus ring consistency.

- [ ] **Step 3: Sub-tabs**

- Keep IDs `dashboard/settings/deals/reviews`; render as segmented control (shared px, active = `btn-primary`, inactive = `btn-outline`) — currently already close; tighten gap + add subtle `border` container: `flex gap-1 rounded-xl border border-white/10 bg-charcoal p-1`.

- [ ] **Step 4: Settings / Deals / Reviews**

- `AdminSettings`: replace section card wrapper with `Card`; keep every field and the save flow identical.
- `AdminDeals` + `AdminReviews`: swap row containers to `Card`; keep buttons as-is (they already use `btn` classes); keep confirm dialogs.

- [ ] **Step 5: Verify**

Run: `npm run build && npm run lint`
Playwright: `/admin` loads (login screen in dev worker-less mode), inputs usable; no console errors; login error path still renders (submit empty → "Enter a username and password.").

- [ ] **Step 6: Commit**

```bash
git add src/routes/Admin.jsx src/routes/admin/
git commit -m "feat: admin panel UI polish — dashboard tiles, glass login, segmented tabs"
```

---

### Task 10: Performance — assets + code-splitting

**Files:**
- Modify: `src/App.jsx` (lazy Admin + Suspense)
- Modify: `src/assets/*` (optimized replacements) + imports in `Navbar.jsx`, `Footer.jsx`, `Trial.jsx`, `Admin.jsx`, `src/data/deals.js`, `Discord.jsx`
- Create: `src/assets/crops/*.webp` variants

**Interfaces:**
- Produces: `React.lazy(() => import('./routes/Admin'))` exported as `Admin`; `<Suspense fallback={<AdminFallback />}>` where fallback is the existing spinner screen markup.

- [ ] **Step 1: Lazy-load Admin in `App.jsx`**

```jsx
import { Suspense, lazy } from 'react';
const Admin = lazy(() => import('./routes/Admin'));
// inside Routes:
<Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" /></div>}>
  <Route path="/admin" element={<Admin />} />
</Suspense>
```

- [ ] **Step 2: Optimize images with Python PIL**

Run in `src/assets` (python3 available; PIL confirmed importable):

```bash
python3 - <<'EOF'
from PIL import Image
import os
os.chdir('src/assets')

# Logo: downscale to 256px (kept as PNG, in place)
im = Image.open('deal-profit-logo.png').convert('RGB')   # RGB — no alpha
im = im.resize((256, 256), Image.LANCZOS)
im.save('deal-profit-logo.png', optimize=True)
print('logo', os.path.getsize('deal-profit-logo.png'))

# Hero deal card image (was jpg) -> webp, keep aspect
Image.open('crops/deal1-hero.jpg').convert('RGB').save('crops/deal1-hero.webp', 'WEBP', quality=82)

# Tall screenshots -> properly cropped webp at render aspect
for name, w, h in [('deal2-cropped.png', 1053, 592)]:  # 16:9
    img = Image.open(name).convert('RGB')
    top = img.crop((0, 0, w, h))
    top.save('crops/deal2-card.webp', 'WEBP', quality=82)

for name in ['discord1-cropped.png', 'discord2-cropped.png']:
    img = Image.open(name).convert('RGB')
    img.save(f'crops/{name.replace(".png", ".webp")}', 'WEBP', quality=80)
EOF
```

Verify each replacement is non-trivially smaller and the logo stays legible at 32px (it's a bold emblem; 256px is ≥ 4× the display size).

- [ ] **Step 3: Swap imports**

- `Navbar`, `Footer`, `Trial`, `Admin`: keep importing `deal-profit-logo.png` (same path — file replaced in place, 944 kB → ~30–60 kB).
- `src/data/deals.js`: `deal1-hero.jpg` → `crops/deal1-hero.webp`; `deal2-cropped.png` → `crops/deal2-card.webp`.
- `Discord.jsx`: `discord1-cropped.png` → `.webp`, `discord2-cropped.png` → `.webp`.
- Audit `src` for any remaining `.jpg`/`.png` imports after the swap via grep.

- [ ] **Step 4: CLS + decoding**

Add `decoding="async"` to hero + Discord/deal card images; keep the existing `aspect-[16/9]` / `aspect-[9/16]` wrappers (already reserve space).

- [ ] **Step 5: Verify**

Run: `npm run build` → record new total of `dist/assets` (expect images ≈ 150–400 kB total, JS main chunk down since Admin is split).
Run: `npm run lint`.
Playwright: `/admin` still renders (lazy chunk loads), `/` and `/deals` still render images (`img.complete` + `naturalWidth > 0` for each card image).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/assets src/components src/data src/routes
git commit -m "perf: lazy-load admin, webp assets, shrink logo 944kB→30kB, CLS-safe images"
```

---

### Task 11: Full QA pass

**Files:**
- Create: `playwright/final-qa-premium.mjs`

- [ ] **Step 1: Write the QA script**

Cover:
1. Routes `/`, `/deals`, `/reviews`, `/upgrade`, `/trial`, `/discord` × viewports [1440×900, 1280×800, 1024×768, 390×844]:
   - `document.documentElement.scrollWidth <= clientWidth` (no h-scroll).
   - screenshot stored to `playwright/.qa` (dev build) for visual review.
   - zero console errors (api fallback 404 allowed and filtered).
   - no `a.btn`/`button.btn` wrapped to two lines (height vs line-height heuristic, flagged only when `height > lineHeight * 1.6`).
2. Interactions (1440): `/deals` press `/` → search focused; type `rtx`; `Esc` clears; category chip count changes; refresh button spins and completes. `/reviews` submit empty form → validation error shows. `/admin` empty submit → validation error shows.
3. Report JSON to stdout + exit code 1 on any failure.

- [ ] **Step 2: Run it**

Run: `node playwright/final-qa-premium.mjs` against the dev server (background `npm run dev`).
Expected: all checks pass; screenshots saved.

- [ ] **Step 3: Run all gates**

```bash
npm run build
npm run lint
node --test worker/*.test.js   # expect 45 pass
```

- [ ] **Step 4: Fix anything surfaced; re-run gates until green.**

- [ ] **Step 5: Commit**

```bash
git add playwright docs README.md 2>/dev/null; git add -A playwright
git commit -m "qa: premium evolution audit script + full pass"
```

---

### Task 12: Deploy + verify production

**Files:**
- None (git + Cloudflare Workers Builds).

- [ ] **Step 1: Pre-flight**

```bash
git status --short   # expect: only intended files, no .dev.vars or secrets
git diff --stat HEAD
```

Scan the working tree for accidental secrets (grep for `.dev.vars` content patterns — it is gitignored, just confirm it is not staged).

- [ ] **Step 2: Update README**

- Add the new pages/sections/design-system bullets and note Space Grotesk + $25/mo pricing copy to the customization section.

- [ ] **Step 3: Commit + push**

```bash
git add -A
git commit -m "docs: README update for premium evolution"
git push origin main
```

- [ ] **Step 4: Verify production (fresh session)**

Create `playwright/verify-prod-premium.mjs` that launches a fresh browser context (no storage), visits `https://goosiev.com/`, `/deals`, `/reviews`:
- Assert HTTP 200 / page renders (h1 present per route).
- Assert the new build is live: check for a marker that only exists in the new build (e.g., Space Grotesk in `document.fonts` list, or the new footer disclaimer text "Deals are not guaranteed...", or `Get Premium` navbar CTA).
- Save screenshots to `playwright/.qa/`.
- Exit 0 on success.

Wait for the Cloudflare Git-connected build to finish (poll the URL until the marker appears, up to ~5 min).

- [ ] **Step 5: Report**

Summarize: what changed, gate results (build/lint/tests), production verification results, and the live URL. Do not claim success from `git push` alone — the marker check is the success signal.