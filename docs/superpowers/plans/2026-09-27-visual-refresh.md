# Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make goosiev.com fill wide screens, refresh the color system, and upgrade animations — without changing copy, pricing, routes, or behavior.

**Architecture:** Token-first refresh in `src/index.css` (@theme + shared utilities), then widen section shells, then motion upgrades in `src/lib/motion.js` + key components. No new dependencies (framer-motion 13.4 + Tailwind v4 already installed; disk is 93% full so no heavy installs).

**Tech Stack:** React + Tailwind CSS v4 (@theme tokens) + framer-motion 13.4 (existing `getMotionProps`/`motionVariants` helpers, reduced-motion safe).

**Spec:** User directive 2026-09-27 — "make the site look better, actually fill the screen not be cut off, change up the colors, better animations." No copy/behavior changes.

## Global Constraints

- No copy, pricing ($25 strings, PRICE constants), route, or API changes — visuals only.
- Every animated element keeps using `getMotionProps(prefersReduced, …)` — reduced-motion users get zero animation.
- `body { overflow-x: clip }` stays; no element may introduce horizontal scroll at 1920px or 390px.
- Admin pages keep the 1152px container (explicitly excluded earlier).
- `npm run build` green + `npx vitest run` stays 69/69 + lint 0 errors.

## Review Focus

- Wide-screen banding: full-bleed background washes must span 100vw with inner content capped — verify at 1920px, no h-scroll.
- 390px mobile: widened grids must collapse (grid-cols-1 base) — verify via emulation.
- Animation performance: transform/opacity only, no layout-animating properties on scroll-driven elements.
- Contrast: new accent hues must keep white-on-dark text ≥ 4.5:1 (eyebrow/dim text included).
- Reduced-motion: all new variants resolve to static via getMotionProps (already the pattern).

---

### Task 1: Color system + shared utilities

**Files:**
- Modify: `src/index.css:3-30` (@theme), `src/index.css:82-145` (components layer)

**Interfaces:**
- Consumes: nothing.
- Produces: new tokens `--color-ember`, `--color-ice`, `--color-lime` (+ existing brand/glow untouched); utilities `.band-full`, `.card-lift`, `.text-shine`, `.ring-conic`; all later tasks use these class names.

- [ ] **Step 1: Extend @theme with three accents + gradient stops**
  Add `--color-ember: #fb923c` (warm amber), `--color-ice: #22d3ee` (cyan), `--color-lime: #a3e635` (chartreuse pop for success/online accents). Keep every existing token byte-identical.
- [ ] **Step 2: Add shared utilities in components layer**
  `.band-full` (full-bleed wash: `relative w-full overflow-hidden` + layered radial gradients using brand/glow/ember at ≤14% alpha); `.card-lift` (hover translate+glow, transform/shadow only); `.text-shine` (animated brand→ember→glow background-position sweep, `prefers-reduced-motion` disables); `.ring-conic` (conic border glow for primary CTA focus/hover).
- [ ] **Step 3: Verify**
  Run: `npm run build` — Expected: green, CSS bundle emitted.
- [ ] **Step 4: Commit** (`git add src/index.css`, message `style: extend accent tokens and shared visual utilities`).

### Task 2: Full-bleed section shells (Home + Upgrade)

**Files:**
- Modify: `src/routes/Home.jsx:237,391,425,446,481` (5 sections), `src/routes/Upgrade.jsx` hero + PaymentFlow wrapper, `src/components/Layout.jsx` (main wrapper stays 1800 cap)

**Interfaces:**
- Consumes: `.band-full` from Task 1.
- Produces: sections render `relative w-full` washes with inner `section-container`; alternating wash tints per section (ember / ice / glow at low alpha).

- [ ] **Step 1: Convert Home sections to full-bleed bands**
  Each of the 5 sections: outer `<section className="band-full …tint…">` + inner `<div className="section-container">` holding existing content unchanged. Alternate tints: hero brand, how ember, hunt ice, finds glow, social brand.
- [ ] **Step 2: Convert Upgrade hero + flow wrapper the same way** (hero = brand wash, PaymentFlow region = neutral/ice wash).
- [ ] **Step 3: Verify at 1920px and 390px**
  Browser: emulate 1920x1080 → `document.documentElement.scrollWidth <= innerWidth` true, washes span 100vw; emulate 390x844 → same, no h-scroll. Screenshot both.
- [ ] **Step 4: Commit** (message `style: full-bleed section bands on Home and Upgrade`).

### Task 3: Motion upgrade

**Files:**
- Modify: `src/lib/motion.js` (add variants), `src/routes/Home.jsx` (hero), `src/components/ui/CTASection.jsx`, `src/components/ui/FeatureCard.jsx`, `src/components/SiteCounter.jsx`

**Interfaces:**
- Consumes: `motionVariants`, `getMotionProps` (existing).
- Produces: new variants `heroEntrance`, `floatSlow`, `pulseGlow`, `marqueeX`; hero uses entrance+float, CTA uses pulseGlow on border, FeatureCard icon gets float on hover, counter gets count-up (transform/opacity only).

- [ ] **Step 1: Add four variants to motion.js** (all transform/opacity; each consumed via getMotionProps so reduced-motion stays static).
- [ ] **Step 2: Wire hero entrance + CTA pulse + card icon float + counter count-up.**
- [ ] **Step 3: Verify**
  Run: `npm run build` green; browser console shows zero errors on Home + Upgrade; screenshot hero.
- [ ] **Step 4: Commit** (message `style: richer entrance, float, pulse, and count-up motion`).

### Task 4: Navbar / Footer / Deals polish + final verification

**Files:**
- Modify: `src/components/Navbar.jsx`, `src/components/Footer.jsx`, `src/components/DealCard.jsx`, `src/components/SpotlightDeal.jsx` (gradient hairlines, ice/ember hover accents, backdrop blur)

**Interfaces:**
- Consumes: tokens + utilities from Task 1.
- Produces: final visual pass; nothing downstream.

- [ ] **Step 1: Apply hairline gradients + accent hovers** (blur bar, gradient divider, ember/ice hover states; no layout changes).
- [ ] **Step 2: Full verification** — `npx vitest run` (69/69), `npm run lint` (0 errors), `npm run build` green, 1920px + 390px screenshots of Home/Upgrade/Deals, no console errors, no h-scroll.
- [ ] **Step 3: Commit, push, verify deploy** (`git push origin main`; `npx wrangler versions list`; confirm new bundle hash in prod HTML).
