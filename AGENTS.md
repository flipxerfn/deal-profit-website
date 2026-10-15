# AGENTS.md — Deal Profit (goosiev.com)

Read this before touching anything. Almost every entry below was paid for with a
measured bug, not a preference. If something here contradicts what you were
about to do, the file wins.

---

## 0. The two facts that will waste your afternoon if you don't know them

**1. THIS MACHINE RENDERS UNDER 1 FPS.** (Measured, repeatedly, across several
sessions — ~988MB RAM, load ~4.1.)

This is not a small slowness. Frames can be seconds apart. Consequences:

- **Never judge an animation by sampling it once.** A CSS animation read at a
  fixed moment can be anywhere on its timeline. Three deploys were burned
  chasing a "price swap bug" that was nothing but mid-animation sampling. The
  swap was fine; the measurement was wrong.
- **Always wait for the thing you care about, with a generous window.** Not
  `waitForTimeout(500)`. Wait on a *condition*, then assert.
- **Measure the harness before the thing under test.** If a browser check
  fails, first confirm the browser can render at all.
- Screenshots, E2E runs and builds are all slow here. Use long timeouts
  (25–45s per E2E assertion, 20s+ for vitest timeouts). Being impatient here
  produces phantom bugs.

**2. `AnimatePresence mode="wait"` IS BANNED SITE-WIDE.** It has deadlocked
twice, both measured:
- The Layout route wrapper: every route change rendered a **blank page** —
  content mounted, laid out, at opacity 0, needing a reload to escape.
- The `/upgrade` price swap: settled at opacity 0 with stale text.

**Route transitions are ENTER-ONLY.** There is no `exit` and no
`AnimatePresence` in `Layout.jsx`. Do not reintroduce one. If you add an
`AnimatePresence`, it must be `sync` (default) or `popLayout` — never `wait`.
`src/__tests__/route-transition.test.js` is a structural guard against this;
don't delete it to make something pass.

---

## 1. Honesty rules (non-negotiable — these are legal/business rules)

- **Never claim income in public copy.** No "thousands a month", "make money",
  "earn". Whop's scam-list rules. This has been enforced across every page.
- **Compute every public claim live. Never hardcode a number.** Feed stats,
  median discount, find counts — all from the API at runtime. `SiteCounter`
  renders what `/api/deals` returns. If the measurement fails, render nothing
  rather than a stale or rounded-off figure.
- **An archived example must always say it is archived.** The hero card labels
  it (`Worked example`, `Archived example · no current offer`, and a
  `role="status"` banner). The live feed and the fallback must never be
  visually ambiguous. `live-hero-feed.test.js` guards this — read the comments
  before touching those labels.
- Never put a fabricated discount figure, "caught just now" age, or
  fabricated count anywhere without the data to back it.

---

## 2. Motion rules

- Animate **only `transform` and `opacity`**. Layout properties (`width`,
  `height`, `top`, `left`, `margin`, `padding`) force reflow every frame.
  `filter: blur()` is acceptable (paint, not layout). Guarded by
  `motion-foundation.test.js`.
- **Respect `prefers-reduced-motion` everywhere.** `useReducedMotion` in
  `src/lib/motion.js` must read `matchMedia` **synchronously in the `useState`
  initialiser** — not in an effect. If it's an effect, the first paint gets
  full motion, which is the whole failure mode reduced-motion support exists
  to prevent.
- **Motion budget (measured, act on it): ~5 animations in the initial viewport,
  under 800ms total.** The home page once ran **19** in-viewport animations at
  390px; it is now 0. Infinite ambient loops behind the hero, on trust dots, or
  on badges are cut-list items — they cost a frame-rate tax and buy no
  information. Keep motion that has a job (reading order, attention, feedback,
  a real bounded signal like the NEW badge). `prefers-reduced-motion` users get
  plain elements, never "the same motion played quietly".
- Scroll reveals are **enter-only** (`once`) — an element that re-animates when
  you scroll back up reads as a glitch, and must never be left hidden.
- Do not add heavy 3D (Three.js, Rive, Spline), particles, or parallax. They
  were deliberately removed: bad on mid-range Android (the actual audience, via
  TikTok traffic) and honestly cut-list per current motion research.

---

## 3. Colour rules

- **The palette is violet. Rose/pink is banned.** A hue-band guard
  (`src/design-tokens.test.js`) rejects anything in the hue range **320–359**
  (rose/magenta/pink). This was written as a hue BAND on purpose — an earlier
  version enumerated literal hex values and `#c92640` slipped through.
- **Pure red (hue 0–20) is allowed** for `destructive` and errors only.
- The primary CTA hover is violet (`#7c3aed`), not rose.
- Pillar accents map to existing semantics: amber = urgent, emerald = savings,
  violet = brand. Don't invent new accent hues.

---

## 4. Layout / measurement gotchas

- **`body` has `overflow-x: clip`.** So `document.documentElement.scrollWidth`
  is always under the viewport and `canScrollRight` is always false — every
  "does it overflow" check passes even when content is badly clipped. To find
  real overflow, **walk the DOM and compare each element's `right` to
  `clientWidth`**. (This is how the 220-overhanging-elements hero bug was found
  and fixed.)
- Grid items default to `min-width: auto`. A grid child needs `min-w-0` to
  shrink, or it pins the whole track. This has broken the hero twice.

---

## 5. Commands

```bash
export PATH="$HOME/.bun/bin:$PATH"

npx vitest run          # unit (src/**) + worker
npm run test:node       # the three node:test suites vitest can't run
npx playwright test     # E2E against PRODUCTION (https://goosiev.com)
npx vite build          # build
npx wrangler deploy     # deploy (targets Workers, NOT Pages)
```

Current state, all green: **568 vitest, 45 node:test, 12 playwright** (the last
with `--retries=0`).

Test-config notes:
- `vite.config.js` scopes vitest to `src/**` and `worker/**`, excluding three
  `node:test` files and `playwright/**`. Don't widen it — that's what made the
  suite report false red files.
- `worker/test/ed25519-helper.js` generates its throwaway keypair in-process.
  Don't reintroduce a dependency on a file outside the repo.

---

## 6. Do not touch

- **`/reviews`** — out of scope unless explicitly asked.
- **The Discord mirror bots** (`Discord-Mirror*`) — leave them alone.
- **The Discord webhook** — leave it alone.
- `body`'s `overflow-x: clip` (see §4 — it's load-bearing).
- The four Vitest files that fail to *collect* are historical; if you see a red
  file but the test count is clean, read §4/the config before assuming a real
  regression.

---

## 7. Whop (business backend)

- Whop is the **checkout + membership backend**. Account `biz_olEvrfdonYlloB`.
  Owner handle `goosievv`. Contact `altacc901210@gmail.com`.
- **`whop` is a CLI at `~/.local/bin/whop`**, not an npm dependency.
- **Whop CLI gotchas (learned the hard way):**
  - `promo-codes amount_off` is passed as a **percent** but reads back as a
    **fraction**. Round-trip it or you will corrupt the discount.
  - `promo-codes delete` / `deactivate` take the `promo_` ID **positionally**.
  - `deactivate` **rejects** `--account_id`.
  - `accounts get` / `update` take the ID **positionally**.
- Current plan: **Deal Feed Setup = $55/month** (plan `plan_Dw2NSX3Tgh1iH`).
  The old `plan_1qXiP1gvwNoS8` is hidden, not deleted.
- Whop's **native cancel discount** (50% × 3 months) on the setup plan replaced
  the 12 manual `SAVEHALF*` promo codes for that product. The codes remain only
  for Premium. Don't recreate them.
- **Trial requires a card on Whop** (all docs corrected to say so). A "card-free
  trial" claim is a scam-list violation.
- **Known open items** (don't re-litigate, just don't claim they're done):
  - **Identity verification is still `required`** — this is the gate on payouts.
    User declined twice; only matters once there's revenue, but `past_due`
    recurs. Fix is dashboard-only.
  - Whop `redirect_url` is **unset** on checkout config `ch_QUKUsx7AxJvFKeM`,
    so buyers skip `/welcome` (the Discord-linking step). The CLI has no
    `update` for checkout configs — dashboard only.
  - Whop's own checkout page copy may still describe a Discord-only free trial
    in a 4th doc we can't edit from the CLI.
- Revenue reality: trials exist but **`total_earned_usd: 0`** — none converted.
  Don't present the business as if it has traction.

---

## 8. Repo security

- **`ADMIN_PASSWORD` was removed from `wrangler.toml`** (committed Oct 13). It
  had been sitting in the tracked file. **It is still in git history** — if that
  password is live anywhere it must be rotated; history rewriting alone doesn't
  help. Secrets belong in the Cloudflare dashboard or `.dev.vars` (gitignored).

---

## 9. Environment / operating notes

- **Open things in the user's real Chrome via `xdg-open`**, never the
  automation browser, unless they say otherwise.
- The `browser` MCP tool may not be connected; it requires the desktop app with
  an experimental setting. If it's disconnected, use Playwright for evidence
  rather than claiming you "looked at it".
- Don't overwrite working code to try an idea. Branch or check first.
- The user dislikes over-building, long question lists, and repeated questions.
  Make a sensible call and say what you did.
- No paid accounts, no ad spend, no subscriptions.
- Lead with evidence: run the check, show the output, then assert.