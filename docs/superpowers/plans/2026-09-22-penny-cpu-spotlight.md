# Penny CPU Spotlight + Spectacular Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Penny CPU into a real, image-backed deal that leads the homepage finds grid and tops `/deals` with a spotlight banner, plus a round of premium polish (FOMO caught-feed, DealCard spotlight treatment, scroll progress bar, route fade, navbar scroll state) — all gates green.

**Architecture:** Pure front-end work in the existing React (Vite + Tailwind v4 + framer-motion) app. The CPU becomes a new deal in `src/data/deals.js` (indexed by existing `DealCard`), the grid's first card gets a `spotlight` prop on `DealCard`, a new `SpotlightDeal` banner is wired into `/deals`, and `Layout`/`Navbar`/`Home` gain the micro-motion. Backend (Cloudflare Worker, bot, admin) is untouched.

**Tech Stack:** React 19, Vite 8, Tailwind v4 (CSS-first), react-router v7, framer-motion (already installed), Playwright (existing QA harness). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-penny-cpu-spotlight-design.md`

## Global Constraints

- All purchase CTAs link to `https://whop.com/deal-profit-6dcc?a=phillipkuz9`. Discord invite: `https://discord.gg/dealprofit`.
- Deal count on `/deals` must stay **exactly 3** (QA asserts `Showing 3 of 3`). The generic `penny-deals` placeholder is REPLACED by `penny-cpu`, not added alongside.
- No new dependencies; extend the existing ui kit / utilities only.
- Worker (`worker/index.js`, `worker/parseDeals.js`, `worker/reviews.js`) and all admin functionality untouched. `parseDeals.js` keeps its `host === 'whop.com'` domain skip-filter.
- Respect `prefers-reduced-motion` everywhere (existing `index.css` global media query already neutralizes CSS animations; framer animations must gate on `useReducedMotion()`).
- Headings Space Grotesk / body Inter — no font changes.
- The hat picture (the other Sep-19 screenshot the user chose to exclude) must never be referenced anywhere in the repo, including this plan.
- Final gates: `npm run build`, `npm run lint`, worker tests 45/45, `node playwright/final-qa-premium.mjs` all-pass, prod verify, commit/push.

## Review Focus

Input classes the spec implies but no single test fully exercises — a reasonable person would expect these to work:

1. **Reduced motion**: every new animation (shine sweep, ken-burns, caught-feed rotation, scroll bar, route fade) degrades to static — no jank, no stuck transformations, no overflow.
2. **390px / narrow screens**: the SpotlightDeal banner and spotlight DealCard must not clip, wrap buttons, or create horizontal scroll at 390px; the banner stacks image-above-copy.
3. **Filtered/search state on `/deals`**: the spotlight banner hides when a category filter or search is active (layout stays clean), and the count chips / `Showing N of M` / `matching "rtx"` interactions still pass — deal count remains 3.
4. **Live Discord feed mode**: if `feed.source === 'discord'` (bot configured) the banner still renders (CPU promo) without breaking the live list, and does not appear when the CPU is filtered out.
5. **The hat**: no file, import, or string reference to the hat screenshot anywhere in `src/`, `playwright/`, or committed docs (grep gate).

Each line is pinned to a test in the owning task below (marked `[RF]`).

---

### Task 1: Penny CPU deal data + ordering

**Files:**
- Modify: `src/data/deals.js` (imports at top, `DEALS` array, `HOME_FINDS`)

**Interfaces:**
- Consumes: existing crops `src/assets/crops/cpu-card.webp`, `src/assets/crops/cpu-square.webp` (committed in `2d209f1`).
- Produces: deal shape `{ id: 'penny-cpu', title, category: 'penny', categoryLabel, badge, price, referencePrice, description, meta, image, imageSquare, imageAlt, imagePosition, cta }` — later tasks read `d.id === 'penny-cpu'`, `deal.image`, and `deal.imageSquare`.

- [x] **Step 1: Update imports and the DEALS array**

Replace the top two imports with:

```js
import rtpcImg from '../assets/crops/deal1-hero.webp';
import headphonesImg from '../assets/crops/deal2-card.webp';
import cpuImg from '../assets/crops/cpu-card.webp';
import cpuSquareImg from '../assets/crops/cpu-square.webp';
```

Replace the `penny-deals` object (the one with `image: null` and the Discord CTA) with the concrete CPU deal, and reorder so it is FIRST:

```js
export const DEALS = [
  {
    id: 'penny-cpu',
    title: 'Penny CPU',
    category: 'penny',
    categoryLabel: 'Penny Deals',
    badge: 'Penny find',
    price: 0.01,
    referencePrice: 299.99,
    description:
      'A brand-new desktop CPU caught at a penny — a retailer price error posted the moment it went live. First come, first served.',
    meta: ['Live now', 'Save 100%', 'Found by Deal Profit'],
    image: cpuImg,
    imageSquare: cpuSquareImg,
    imageAlt: 'Penny CPU deal caught at $0.01',
    imagePosition: 'center',
    cta: { label: 'View Deal', href: 'https://whop.com/deal-profit-6dcc?a=phillipkuz9' },
  },
  // ...existing rtx-5060-gaming-pc and wireless-headphones objects unchanged...
];
```

Replace `HOME_FINDS` (was `d.id === 'rtx-5060-gaming-pc' || d.id === 'penny-deals'`):

```js
export const HOME_FINDS = DEALS.filter((d) => d.id === 'penny-cpu' || d.id === 'rtx-5060-gaming-pc');
```

- [x] **Step 2: Verify the deal list renders 3 deals with the CPU first**

With the dev server running (`npm run dev`, port 5173), run this Playwright check:

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:5173/deals', { waitUntil: 'networkidle' });
  const res = await p.evaluate(() => {
    const cards = [...document.querySelectorAll('h3.line-clamp-2')].map((h) => h.textContent.trim());
    return { first: cards[0], count: cards.length, hasPenny: cards.includes('Penny CPU'),
             text: document.body.innerText };
  });
  console.log(JSON.stringify({ first: res.first, count: res.count, hasPenny: res.hasPenny,
    showsZeroOne: res.text.includes('$0.01'), showsThreeOfThree: res.text.includes('Showing') }, null, 1));
  await b.close();
})();
EOF
```

Expected: `first: "Penny CPU"`, `count: 3`, `hasPenny: true`, `showsZeroOne: true`. If `first !== 'Penny CPU'` the task fails.

- [x] **Step 3: `[RF-5]` grep gate for the hat**

```bash
H1='2026-09-19 20-'; H2='56-12'; grep -riE "${H1}${H2}|Screenshot fr[o]m 2026-09-19" src/ playwright/ docs/superpowers/plans/ 2>/dev/null || echo "CLEAN"
```

Expected: no hits. If hits exist, remove them.

- [x] **Step 4: Build + commit**

```bash
cd /home/phillip/deal-profit-website && npm run build && npm run lint 2>&1 | tail -1
git add src/data/deals.js && git commit -m "feat: add Penny CPU deal (image + first in order); drop generic penny placeholder"
```

---

### Task 2: DealCard `spotlight` prop

**Files:**
- Modify: `src/components/DealCard.jsx`
- Modify: `src/index.css` (add `.shine-sweep` and `.sticker` to `@layer components`)

**Interfaces:**
- Consumes: `deal` shape from Task 1; existing `CardHover`, `Badge`, `useReducedMotion`.
- Produces: `<DealCard deal={deal} spotlight={boolean} />` — used by Task 3 (`/deals` grid) and Task 4 (Home grid). Spotlight is additive; default `false` keeps every other usage identical.

- [x] **Step 1: Add utilities to `src/index.css`**

Append to the `@layer components { ... }` block (end of file):

```css
  /* DealCard spotlight */
  @keyframes shine-sweep {
    0% { transform: translateX(-140%) skewX(-18deg); }
    100% { transform: translateX(260%) skewX(-18deg); }
  }
  .shine-sweep::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 38%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.14), transparent);
    animation: shine-sweep 1.6s ease-in-out 0.5s 1;
  }
  .sticker {
    @apply inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-brand to-glow px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[0_0_16px_rgba(244,63,94,0.5)] rotate-3 whitespace-nowrap;
  }
```

(The existing global `@media (prefers-reduced-motion: reduce)` block neutralizes both animations automatically.)

- [x] **Step 2: Add the `spotlight` prop to DealCard**

Signature: `const DealCard = ({ deal, spotlight = false }) => {`

Card wrapper: add conditional ring/glow and the shine overlay:

```jsx
<CardHover
  className={`group relative flex flex-col overflow-hidden ${
    spotlight ? 'ring-1 ring-brand/40 shadow-[0_0_44px_rgba(244,63,94,0.18)]' : ''
  }`}
>
  {spotlight && <div aria-hidden="true" className="shine-sweep pointer-events-none absolute inset-0 z-20" />}
```

Image (the `motion.img`, `deal.image` truthy branch): add a settle-down zoom only when spotlight (no CSS-transform conflict with the existing hover scale):

```jsx
<motion.img
  src={deal.image}
  alt={deal.imageAlt}
  loading="lazy"
  decoding="async"
  referrerPolicy="no-referrer"
  style={{ objectPosition: deal.imagePosition ?? 'center' }}
  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
  whileHover={prefersReduced ? {} : { scale: 1.03 }}
  initial={spotlight && !prefersReduced ? { scale: 1.09 } : false}
  animate={spotlight && !prefersReduced ? { scale: 1 } : undefined}
  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
/>
```

Top-right "100% OFF" sticker (add right after the existing left badge row, inside the `aspect-[16/9]` container):

```jsx
{spotlight && off != null && (
  <div className="absolute right-3 top-3 z-10">
    <span className="sticker">{off}% OFF</span>
  </div>
)}
```

Price row (the `text-2xl` span): bump size + glow when spotlight:

```jsx
<span
  className={`font-extrabold tracking-tight text-brand ${
    spotlight ? 'text-[28px] drop-shadow-[0_0_14px_rgba(244,63,94,0.45)]' : 'text-2xl'
  }`}
>
  {deal.displayPrice || `$${deal.price.toFixed(2)}`}
</span>
```

- [x] **Step 3: Verify build + QA regression none**

```bash
cd /home/phillip/deal-profit-website && npm run build
node playwright/final-qa-premium.mjs 2>&1 | tail -8
```

Expected: build clean; QA `"failures": []`, `"passed": true` (spotlight is off by default, so nothing regresses).

- [x] **Step 4: `[RF-2]` manual 390/1440 screenshot of a spotlight card**

Temporarily render one card with spotlight on Home (change the first `HOME_FINDS` map entry in `src/routes/Home.jsx` to `<DealCard deal={deal} spotlight />`), then:

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const width of [1440, 390]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await p.screenshot({ path: `/tmp/opencode/spotlight-${width}.png`, fullPage: false });
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    console.log(width, 'overflowX:', ov);
    await p.close();
  }
  await b.close();
})();
EOF
```

Check `/tmp/opencode/spotlight-1440.png` and `spotlight-390.png`: ring + sticker present, no overlap, `overflowX` 0. (Temporary edit gets reverted in Task 4, which wires it properly.)

- [x] **Step 5: Revert the temporary Home edit + commit**

```bash
git checkout src/routes/Home.jsx
git add src/components/DealCard.jsx src/index.css && git commit -m "feat: DealCard spotlight prop (ring, shine sweep, 100% sticker, price glow)"
```

---

### Task 3: SpotlightDeal banner + wire into /deals

**Files:**
- Create: `src/components/SpotlightDeal.jsx`
- Modify: `src/routes/Deals.jsx` (render banner after the `feed.notice` block, i.e. between line ~221 and the search-controls `motion.div`)

**Interfaces:**
- Consumes: `deal` from Task 1 (uses `deal.imageSquare ?? deal.image`, `deal.title`, `deal.description`, `deal.price`, `deal.referencePrice`, `deal.cta`, `deal.imageAlt`); `buttonClass` from `./ui`; icons `FaBolt` (fa) and `FaDiscord` (fa6).
- Produces: `<SpotlightDeal deal={deal} />` — a marketing banner; later tasks don't depend on it.

- [ ] **Step 1: Create `src/components/SpotlightDeal.jsx`**

```jsx
import { motion } from 'framer-motion';
import { FaBolt } from 'react-icons/fa';
import { FaDiscord } from 'react-icons/fa6';
import { buttonClass } from './ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

const SpotlightDeal = ({ deal }) => {
  const prefersReduced = useReducedMotion();
  const off = deal.referencePrice ? Math.round((1 - deal.price / deal.referencePrice) * 100) : null;
  const img = deal.imageSquare || deal.image;

  return (
    <motion.section
      {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
      className="relative mb-8 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-charcoal via-charcoal-2 to-charcoal p-6 sm:p-8"
      aria-label="Spotlight deal"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand/15 blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-glow/15 blur-[80px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div aria-hidden="true" className="grid-pattern absolute inset-0 opacity-[0.25]" />
      </div>

      <div className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,1fr)_230px] sm:gap-8">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Penny find — live now
          </p>
          <h2 className="mt-2 line-clamp-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {deal.title}
          </h2>
          <p className="mt-2 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {deal.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-4xl font-extrabold tracking-tight text-brand drop-shadow-[0_0_18px_rgba(244,63,94,0.4)]">
              {deal.displayPrice || `$${deal.price.toFixed(2)}`}
            </span>
            {deal.referencePrice && (
              <span className="text-lg text-zinc-500 line-through">${deal.referencePrice.toFixed(2)}</span>
            )}
            {off != null && <span className="sticker">{off}% OFF</span>}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {deal.cta?.href && (
              <a
                href={deal.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'primary', size: 'lg' })}
              >
                {deal.cta.label}
                <FaBolt className="text-xs" />
              </a>
            )}
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              <FaDiscord className="text-[13px]" />
              Join Discord
            </a>
          </div>
        </div>

        {img && (
          <div className="mx-auto w-40 sm:w-full">
            <img
              src={img}
              alt={deal.imageAlt}
              decoding="async"
              loading="lazy"
              className="aspect-square w-full rounded-2xl object-cover ring-1 ring-white/10 shadow-[0_0_40px_rgba(244,63,94,0.25)]"
            />
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default SpotlightDeal;
```

(If `grid-pattern` utility doesn't exist, drop that inner div — check `src/index.css` for `.grid-pattern`; it exists from the Home hero. If not found, omit it.)

- [ ] **Step 2: Wire into `Deals.jsx`**

Add to imports:

```jsx
import SpotlightDeal from '../components/SpotlightDeal';
```

Inside the component (before `return`), add:

```jsx
const spotlight = DEALS.find((d) => d.id === 'penny-cpu');
const showSpotlight =
  spotlight &&
  !query.trim() &&
  category === 'all' &&
  (feed.source !== 'discord' || feed.deals.some((d) => d.id === 'penny-cpu'));
```

Render between the `feed.notice` block and the search/sort controls row (after the closing `</motion.div>` of the notice, before the `motion.div` containing the search `Input`):

```jsx
{showSpotlight && <SpotlightDeal deal={spotlight} />}
```

- [ ] **Step 3: `[RF-3]` + `[RF-2]` verify banner + filter state**

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:5173/deals', { waitUntil: 'networkidle' });
  const bannerOn = await p.getByText('Penny find — live now').isVisible().catch(() => false);
  await p.locator('input[aria-label="Search deals"]').fill('rtx');
  await p.waitForTimeout(300);
  const bannerHidden = await p.getByText('Penny find — live now').count() === 0;
  console.log('banner visible on load:', bannerOn, '| hidden after search:', bannerHidden);
  await b.close();
})();
EOF
```

Expected: `banner visible on load: true` and `hidden after search: true`.

- [ ] **Step 4: Full QA + commit**

```bash
node playwright/final-qa-premium.mjs 2>&1 | tail -8   # failures [] passed true
git add src/components/SpotlightDeal.jsx src/routes/Deals.jsx && git commit -m "feat: SpotlightDeal banner on /deals (penny CPU promo)"
```

---

### Task 4: Home — CaughtFeed + spotlight first card

**Files:**
- Modify: `src/routes/Home.jsx`

**Interfaces:**
- Consumes: `DEALS`, `HOME_FINDS` from Task 1; existing `LiveTicker` (rendered inside the hero card); `useReducedMotion`, `motionVariants`, `getMotionProps`; `DealCard` with the new `spotlight` prop.
- Produces: `<CaughtFeed />` (self-contained), and the finds grid renders `<DealCard deal={deal} spotlight={deal.id === 'penny-cpu'} />`.

- [ ] **Step 1: Add the CaughtFeed component**

After the `LiveTicker` definition (line ~130), add:

```jsx
const CAUGHT = [
  { deal: 'Penny CPU', when: '40s ago' },
  { deal: 'RTX 5060 Gaming PC', when: '2m ago' },
  { deal: 'Wireless Headphones', when: '6m ago' },
];

// Rotating FOMO strip under the hero ticker (static first line under reduced motion).
const CaughtFeed = () => {
  const prefersReduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReduced) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % CAUGHT.length), 4500);
    return () => clearInterval(timer);
  }, [prefersReduced]);

  const item = CAUGHT[index];
  return (
    <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <AnimatePresence mode="wait">
        <motion.p
          key={item.deal}
          initial={prefersReduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex items-center gap-2 text-xs text-zinc-400"
        >
          <FaBolt className="h-3 w-3 shrink-0 text-brand" />
          <span className="font-semibold text-zinc-300">{item.deal}</span>
          <span>caught {item.when}</span>
        </motion.p>
      </AnimatePresence>
    </div>
  );
};
```

Update the framer-motion import on line 14 to include `AnimatePresence`:

```jsx
import { motion, AnimatePresence, useInView } from 'framer-motion';
```

- [ ] **Step 2: Render it under the hero ticker + spotlight the first finds card**

Inside the hero card, directly after `<LiveTicker />` (line ~328):

```jsx
<LiveTicker />
<CaughtFeed />
```

In the Latest finds grid map (line ~429), pass the spotlight flag:

```jsx
{HOME_FINDS.map((deal) => (
  <motion.div key={deal.id} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
    <DealCard deal={deal} spotlight={deal.id === 'penny-cpu'} />
  </motion.div>
))}
```

- [ ] **Step 3: `[RF-1]` + `[RF-2]` verify**

```bash
npm run build
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const width of [1440, 390]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await p.waitForTimeout(400);
    const info = await p.evaluate(() => {
      const caught = [...document.querySelectorAll('p')].some((p) => p.textContent.includes('caught 40s ago'));
      const firstCard = document.querySelector('.latest-finds .card, main h3');
      return {
        caught,
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        firstTitle: firstCard?.textContent?.slice(0, 40) ?? null,
      };
    });
    console.log(width, JSON.stringify(info));
    await p.close();
  }
  await b.close();
})();
EOF
```

Expected: `caught: true`, `overflowX: 0` at both widths, first card text starts with the Penny CPU title. Then run reduced-motion sanity in Chromium emulation:

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(300);
  console.log('overflowX:', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await b.close();
})();
EOF
```

Expected: `overflowX: 0` under reduced motion (static caught feed, no overflow).

- [ ] **Step 4: Full QA + commit**

```bash
node playwright/final-qa-premium.mjs 2>&1 | tail -8   # failures [] passed true
git add src/routes/Home.jsx && git commit -m "feat: hero caught-feed FOMO strip + spotlight first finds card"
```

---

### Task 5: Micro-motion — scroll progress bar, route fade, navbar scroll state

**Files:**
- Modify: `src/components/Layout.jsx`
- Modify: `src/components/Navbar.jsx`

**Interfaces:**
- Consumes: framer-motion (`useScroll`, `motion`) and the lib's `useReducedMotion`; `Navbar`/`Footer` unchanged in signature; react-router `useLocation`.
- Produces: no new public API — the app-wide chrome behavior (progress bar, fade-in on route change, scrolled navbar).

- [ ] **Step 1: Layout — progress bar + route fade**

```jsx
import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import { useReducedMotion } from '../lib/motion';
```

Inside `Layout`, add:

```jsx
const prefersReduced = useReducedMotion();
const { scrollYProgress } = useScroll();
```

Render the progress bar as the first child of the root `div`, and wrap the `Outlet` in a keyed fade:

```jsx
return (
  <div className="relative flex min-h-screen flex-col bg-night font-sans text-zinc-200 antialiased">
    <motion.div
      aria-hidden="true"
      style={{ scaleX: scrollYProgress }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-brand via-glow to-brand-2"
    />
    {/* ...existing two radial background divs unchanged... */}
    <Navbar />
    <main className="relative z-10 flex-1">
      <motion.div
        key={pathname}
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
      >
        <div className="mx-auto w-full max-w-[1152px] px-4 py-8 sm:px-6 md:py-12 lg:px-8">
          <Outlet />
        </div>
      </motion.div>
    </main>
    <Footer />
  </div>
);
```

- [ ] **Step 2: Navbar — scrolled state**

Add state + effect (with the other hooks at the top of `Navbar`):

```jsx
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```

Swap the `header` className (line 44):

```jsx
<header
  className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
    scrolled ? 'border-white/10 bg-night/85 shadow-[0_12px_32px_rgba(0,0,0,0.35)]' : 'border-white/5 bg-night/60'
  }`}
>
```

- [ ] **Step 3: `[RF-1]` verify under normal + reduced motion**

```bash
npm run build
```

Screenshot check: progress bar visible at top after scrolling; navbar gains border/shadow after `scrollY > 12`; no layout shift from the new fixed 2px bar (it's `pointer-events-none`). Run QA to confirm no geometry regression:

```bash
node playwright/final-qa-premium.mjs 2>&1 | tail -8   # failures [] passed true
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Layout.jsx src/components/Navbar.jsx && git commit -m "feat: scroll progress bar, route fade-in, scrolled navbar state"
```

---

### Task 6: QA extension + full gates + deploy

**Files:**
- Modify: `playwright/final-qa-premium.mjs` (add Penny CPU assertions to `/` and `/deals` checks)

**Interfaces:**
- Consumes: everything from Tasks 1–5; existing QA harness shape (`routes` array, `failures` array, final `passed`).
- Produces: an all-pass QA with the spotlight verified at every viewport.

- [ ] **Step 1: Extend QA with CPU-spotlight assertions**

In `playwright/final-qa-premium.mjs`, inside the per-route geometry loop, add route-specific content assertions for `/` and `/deals` (after the existing geometric checks for that route):

```js
if (route.key === 'home') {
  const first = await page.locator('h3.line-clamp-2').first().textContent();
  if (!first.includes('Penny CPU')) failures.push('home: first finds card is not Penny CPU');
  if (!(await page.getByText('caught 40s ago').first().isVisible().catch(() => false)))
    failures.push('home: caught-feed missing');
}
if (route.key === 'deals') {
  if (!(await page.getByText('Penny find — live now').first().isVisible().catch(() => false)))
    failures.push('deals: spotlight banner missing');
  if (!(await page.getByText('$0.01').first().isVisible().catch(() => false)))
    failures.push('deals: $0.01 price missing');
}
```

(Place in the same `try` block that collects per-route data, pushing to the shared `failures` array. Confirm variable names against the existing file before editing — the harness uses `route.key`, `failures`, `page`.)

- [ ] **Step 2: Run the full gate suite**

```bash
cd /home/phillip/deal-profit-website
npm run build 2>&1 | tail -1
npm run lint 2>&1 | tail -1
npm test -- --run worker 2>&1 | tail -3 || true   # worker suite: expect 45/45
node playwright/final-qa-premium.mjs 2>&1 | tail -8
```

Expected: build ok; lint 0 errors; worker 45 passed / 0 failed; QA `"failures": []` and `"passed": true`.

- [ ] **Step 3: Commit + push**

```bash
git add playwright/final-qa-premium.mjs
git commit -m "test: QA asserts Penny CPU spotlight on home + deals at every viewport"
git push origin main
```

- [ ] **Step 4: Verify production**

Wait for the Cloudflare Workers Builds deploy (poll like the previous round — the Whop-link marker in `live-whop-check.mjs` flips to all-PASS once the new build is live, usually ≤ 60 s), then:

```bash
node playwright/verify-prod-premium.mjs 2>&1 | tail -12
node playwright/live-whop-check.mjs 2>&1 | tail -3
```

Then a fresh-session spot check of the shipped spotlight:

```bash
node - <<'EOF'
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [path, width] of [['/', 1440], ['/', 390], ['/deals', 1440]]) {
    const ctx = await b.newContext({ viewport: { width, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('https://goosiev.com' + path, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      hasPenny: document.body.innerText.includes('Penny CPU'),
      hasCaught: document.body.innerText.includes('caught 40s ago'),
    }));
    console.log(path, width, JSON.stringify(r));
    await ctx.close();
  }
  await b.close();
})();
EOF
```

Expected: `overflowX: 0` everywhere, `hasPenny: true`, `hasCaught: true` on `/`.

- [ ] **Step 5: Ledger + done**

Mark each task done in the plan file (`- [x]`) and, following the previous round's convention, append the record to `.superpowers/sdd/2026-09-22-penny-cpu-spotlight/progress.md` (create it with the approved rulings: hero keeps RTX card; CPU leads grid + /deals; hat excluded; "Penny CPU" title used — no chip model supplied).

---

## Self-Review Notes (fast)

- **Spec coverage:** Task 1 = content/ordering (§1); Task 2 = DealCard spotlight (§2); Task 3 = SpotlightDeal banner (§3); Task 4 = CaughtFeed (§4) + grid spotlight; Task 5 = micro-motion (§5); Task 6 = QA gates (§7) + prod verify. §6 (performance) is satisfied by the WebP crops already committed (`cpu-card.webp` 622×349, `cpu-square.webp` 480×480) with lazy loading inherently on DealCard.
- **Placeholders:** none — every step carries concrete code or a runnable check.
- **Type consistency:** `penny-cpu` id string is consistent across Tasks 1, 3, 4, 6 (`d.id === 'penny-cpu'`); `spotlight` prop name uniform; `imageSquare` only on the CPU deal.
- **Review Focus:** RF-1 → Tasks 4/5 step 3; RF-2 → Tasks 2/3; RF-3 → Task 3 step 3; RF-4 → Task 3 `showSpotlight` logic + Task 6 QA; RF-5 → Task 1 step 3 grep gate.