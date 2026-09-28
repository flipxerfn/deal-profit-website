# Performance & Animation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate jank, make all animations buttery-smooth at 60fps, and give every page/tab premium motion feel — no layout thrashing, transform/opacity only, reduced-motion safe.

**Architecture:** Audit existing motion for layout-triggering properties; replace with transform/opacity; add will-change hints; use Framer Motion's layout animations for shared element transitions; centralize spring configs; add scroll-driven entrance for below-fold content.

**Tech Stack:** React + Framer Motion 13.4 + Tailwind v4; no new deps (disk 93% full).

**Spec:** User directive: "make it less laggier more smooth and better animations for every tab."

## Global Constraints

- Every animated property must be transform/opacity (no width/height/top/left/margin/padding animations).
- `getMotionProps(prefersReduced, ...)` pattern mandatory — reduced-motion users get static.
- No animation longer than 600ms default; spring configs centralized in `motionVariants`.
- Admin pages excluded (keep functional).
- Build green, 77/77 tests pass, 0 lint errors.

## Review Focus

- Scroll jank on Home/Upgrade/Deals: no layout shift during scroll-driven entrance.
- Reduced-motion: all motion instantly static, no flash.
- Mobile (390px): zero h-scroll during any animation.
- Tab-switch (if any): smooth shared-element transitions.
- Admin: untouched.

---

### Task 1: Motion audit & spring config centralization

**Files:**
- Modify: `src/lib/motion.js` (centralize springs, add `scrollReveal`, `layoutSpring`, `pageTransition`)
- Create: `src/hooks/useScrollReveal.js` (IntersectionObserver-based entrance, single observer)

**Interfaces:**
- Produces: `motionVariants.layoutSpring`, `motionVariants.pageTransition`, `motionVariants.scrollReveal`; hook `useScrollReveal(threshold?, rootMargin?)`

- [ ] **Step 1: Write failing test** for `motionVariants` new keys existence
- [ ] **Step 2: Add spring presets** (`gentle`, `snappy`, `bouncy`) + `scrollReveal` (opacity + translateY, 0.5s easeOut) + `pageTransition` (cross-fade + slight scale, 0.35s)
- [ ] **Step 3: Create `useScrollReveal`** hook — single IO per page, returns ref + `isVisible`, auto-cleanup
- [ ] **Step 4: Verify** — `npm run build` green
- [ ] **Step 5: Commit** (`style: centralize springs + scroll-reveal hook`)

### Task 2: Replace layout-triggering animations

**Files:**
- Modify: `src/routes/Home.jsx` (hero orbs use `transform` not `x/y`; card hover uses `scale` not translate)
- Modify: `src/components/DealCard.jsx` (image zoom uses `scale`, not transform-origin tricks)
- Modify: `src/components/ui/FeatureCard.jsx` (icon lift uses `y: -4` via transform)
- Modify: `src/components/ui/CTASection.jsx` (background gradient shift → pseudo-element opacity cross-fade)

**Interfaces:**
- Consumes: `motionVariants` from Task 1.

- [ ] **Step 1: Audit & replace** — grep for `animate: { x:`, `animate: { y:`, `whileHover: { x:`, `whileHover: { y:`, `width:`, `height:`, `margin:`, `padding:` in motion props; replace all with `scale`, `rotate`, `translateX/Y` (transform) + `opacity`
- [ ] **Step 2: Add `will-change: transform, opacity`** via `.card-lift`, `.image-zoom` utility classes
- [ ] **Step 3: Verify at 1920px & 390px** — zero layout shift, DevTools Performance shows no "Recalculate Style" during hover
- [ ] **Step 4: Commit** (`perf: transform-only animations, will-change hints`)

### Task 3: Scroll-driven entrance (below-fold sections)

**Files:**
- Modify: `src/routes/Home.jsx` (each band uses `useScrollReveal` ref + `motionVariants.scrollReveal`)
- Modify: `src/routes/Upgrade.jsx` (comparison grid, FAQ accordion items)
- Modify: `src/routes/Deals.jsx` (deal cards stagger on scroll)

**Interfaces:**
- Consumes: `useScrollReveal` hook, `motionVariants.scrollReveal`.

- [ ] **Step 1: Add `useScrollReveal` to each band/card** — ref on section wrapper, motion.div with `initial=false` until `isVisible`
- [ ] **Step 2: Stagger children** — `staggerContainer` + `staggerItem` inside revealed parent
- [ ] **Step 3: Verify** — scroll through 1920px Home/Upgrade; sections fade/slide in smoothly, no jank, no double-fire
- [ ] **Step 4: Commit** (`ux: scroll-reveal entrance for all below-fold content`)

### Task 4: Page transitions + shared layout (optional but high-impact)

**Files:**
- Modify: `src/components/Layout.jsx` (wrap `<Outlet />` in `<AnimatePresence mode="wait">` + `<motion.div layout>` for shared elements)
- Modify: `src/components/Navbar.jsx` (logo/nav links get `layoutId="brand"` for shared transition)

**Interfaces:**
- Consumes: `motionVariants.pageTransition`.

- [ ] **Step 1: Wrap outlet** with `AnimatePresence` + cross-fade pageTransition
- [ ] **Step 2: Add `layoutId` to shared elements** (logo, primary CTA)
- [ ] **Step 3: Verify** — click Home→Upgrade→Deals→Reviews; smooth fade + shared logo morph, no flash
- [ ] **Step 4: Commit** (`ux: page transitions + shared layout morph`)

### Task 5: Final verification & deploy

**Files:** —
- [ ] **Step 1: Full suite** — `npx vitest run` (77/77), `npm run build` green, `npm run lint` 0 errors
- [ ] **Step 2: Browser perf** — 1920px Home/Upgrade/Deals/Reviews scroll + hover + click; DevTools Performance: 60fps, no layout shifts, all animations transform/opacity
- [ ] **Step 3: Mobile** — 390px scroll + tap; zero h-scroll
- [ ] **Step 4: Commit, push, verify deploy** (`git push`; `wrangler versions list`; prod bundle hash check)