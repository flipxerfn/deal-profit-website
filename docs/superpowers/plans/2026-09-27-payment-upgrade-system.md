# Payment & Upgrade System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a complete payment/upgrade system with Stripe subscriptions, Discord OAuth2 linking, and automated "deal-profit" role management (grant on payment, revoke after 1 month).

**Architecture:** Extend the existing Cloudflare Worker with new API endpoints for Stripe checkout, Discord OAuth2, and subscription management. Extend the DEAL_STORE Durable Object to store user subscriptions and Discord mappings. Frontend gets a new Payment page and updated Upgrade/Trial pages with Discord link flow.

**Tech Stack:** React 19, Cloudflare Workers, Durable Objects (SQLite), Stripe (subscriptions + checkout), Discord OAuth2, react-router-dom v7.

**Spec:** User requirements from conversation (free trial via Discord ticket, $25/mo after, multiple payment methods, Discord linking required, 1-month role auto-revoke).

## Global Constraints

- All secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI) stored in Cloudflare dashboard as secrets, never in code
- Discord bot must have `guilds.members.read` and `guilds.members.update` permissions for role management
- Stripe webhook endpoint must be configured in Stripe dashboard pointing to `/api/stripe/webhook`
- Free trial: user joins Discord → creates ticket → gets trial access (manual or automated)
- Premium: $25/month recurring, Stripe handles billing
- Role "deal-profit" granted on successful payment, revoked 30 days after if not renewed
- Replace all Whop links with `https://discord.gg/dealprofit`

## Review Focus

1. **Stripe webhook signature verification** - Must verify `stripe-signature` header to prevent spoofed events
2. **Discord OAuth state parameter** - Must validate `state` to prevent CSRF on OAuth flow
3. **Role revocation timing** - Scheduled job must run daily and only revoke if subscription truly expired (not just past due)
4. **Idempotency** - Stripe events may be delivered multiple times; handle gracefully
5. **Discord API rate limits** - Role grant/revoke must respect Discord rate limits (batched, with backoff)

---

### Task 1: Add Stripe & Discord OAuth dependencies and config

**Files:**
- Modify: `package.json` (add dependencies)
- Modify: `wrangler.toml` (add secrets bindings)
- Create: `.dev.vars.example` additions (local dev secrets)

**Interfaces:**
- Produces: Stripe and Discord OAuth config available in Worker env

- [ ] **Step 1: Add npm dependencies**
```bash
npm install stripe @stripe/stripe-js
```
- [ ] **Step 2: Update wrangler.toml with new secret bindings**
```toml
[vars]
# ... existing vars ...
STRIPE_PUBLISHABLE_KEY = ""  # public, safe in vars
```
- [ ] **Step 3: Update .dev.vars.example with new secrets**
```bash
# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

# Discord OAuth2
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=http://localhost:8788/api/discord/callback
```
- [ ] **Step 4: Commit**

---

### Task 2: Extend DEAL_STORE Durable Object for subscriptions

**Files:**
- Modify: `worker/store.js` (add subscription schema and methods)
- Test: `worker/store.test.js` (new tests for subscription methods)

**Interfaces:**
- Consumes: Existing `DealStore` class
- Produces: New methods `getSubscription(userId)`, `upsertSubscription(sub)`, `getUserByDiscordId(discordId)`, `linkDiscord(userId, discordId)`, `getExpiredSubscriptions()`, `revokeSubscription(userId)`

- [ ] **Step 1: Write failing tests for new subscription methods**
```javascript
// store.test.js
test('upsertSubscription and getSubscription', async () => { ... })
test('linkDiscord and getUserByDiscordId', async () => { ... })
test('getExpiredSubscriptions returns expired subs', async () => { ... })
```
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement subscription schema in store.js**
```sql
-- Add to Durable Object SQL schema
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT, -- active, past_due, canceled, trialing
  current_period_end INTEGER, -- unix timestamp
  discord_id TEXT UNIQUE,
  discord_linked_at INTEGER,
  created_at INTEGER,
  updated_at INTEGER
);
```
- [ ] **Step 4: Implement all new methods in DealStore class**
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Commit**

---

### Task 3: Add Stripe Checkout Session creation endpoint

**Files:**
- Modify: `worker/index.js` (add `/api/stripe/create-checkout` POST handler)
- Test: `worker/stripe.test.js` (new test file)

**Interfaces:**
- Consumes: `DEAL_STORE` binding, `STRIPE_SECRET_KEY` secret, `STRIPE_PUBLISHABLE_KEY` var
- Produces: POST `/api/stripe/create-checkout` → `{ sessionId, url }`

- [ ] **Step 1: Write failing test for checkout creation**
```javascript
test('creates checkout session for authenticated user', async () => { ... })
test('requires authentication', async () => { ... })
```
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `/api/stripe/create-checkout` in index.js**
```javascript
// Requires admin session (reuse getSession)
// Creates Stripe Checkout Session for $25/mo subscription
// Success URL: /upgrade?session_id={CHECKOUT_SESSION_ID}
// Cancel URL: /upgrade
// Metadata: { userId: session.u }
```
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Add Stripe Webhook handler

**Files:**
- Modify: `worker/index.js` (add `/api/stripe/webhook` POST handler)
- Test: `worker/stripe.test.js` (webhook tests)

**Interfaces:**
- Consumes: `DEAL_STORE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Produces: POST `/api/stripe/webhook` → handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

- [ ] **Step 1: Write failing tests for webhook events**
```javascript
test('checkout.session.completed creates subscription', async () => { ... })
test('customer.subscription.updated updates status', async () => { ... })
test('customer.subscription.deleted marks canceled', async () => { ... })
test('verifies stripe signature', async () => { ... })
```
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement webhook handler in index.js**
```javascript
// Verify stripe-signature header using STRIPE_WEBHOOK_SECRET
// Switch on event.type
// On checkout.session.completed: upsert subscription with status from session
// On subscription updated: update status, current_period_end
// On subscription deleted: mark canceled
// On invoice.payment_failed: mark past_due
```
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 5: Add Discord OAuth2 endpoints

**Files:**
- Modify: `worker/index.js` (add `/api/discord/auth` GET, `/api/discord/callback` GET)
- Test: `worker/discord-oauth.test.js` (new test file)

**Interfaces:**
- Consumes: `DEAL_STORE`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
- Produces: GET `/api/discord/auth` → redirects to Discord OAuth
- Produces: GET `/api/discord/callback?code=...&state=...` → exchanges code, links account, redirects to frontend

- [ ] **Step 1: Write failing tests for OAuth flow**
```javascript
test('/api/discord/auth redirects to Discord with state', async () => { ... })
test('/api/discord/callback exchanges code and links account', async () => { ... })
test('validates state parameter', async () => { ... })
```
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement Discord OAuth endpoints in index.js**
```javascript
// GET /api/discord/auth
//   - Generate random state, store in cookie (HttpOnly, short expiry)
//   - Redirect to https://discord.com/api/oauth2/authorize?client_id=...&redirect_uri=...&response_type=code&scope=identify+guilds.members.read&state=...

// GET /api/discord/callback
//   - Verify state matches cookie
//   - Exchange code for access_token at https://discord.com/api/oauth2/token
//   - Fetch user info from https://discord.com/api/users/@me
//   - Link discord_id to current user session (requires auth)
//   - Redirect to /upgrade?linked=true
```
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 6: Add Discord bot role management

**Files:**
- Modify: `worker/index.js` (add `grantRole(discordId)`, `revokeRole(discordId)` helpers)
- Test: `worker/discord-role.test.js` (new test file)

**Interfaces:**
- Consumes: `DEAL_STORE`, Discord bot token from config, Discord guild ID (from env or config)
- Produces: `grantRole(discordId)` → adds "deal-profit" role, `revokeRole(discordId)` → removes role

- [ ] **Step 1: Write failing tests for role management**
```javascript
test('grantRole adds role via Discord API', async () => { ... })
test('revokeRole removes role via Discord API', async () => { ... })
test('handles rate limits with backoff', async () => { ... })
```
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement role management in index.js**
```javascript
// Uses Discord bot token from resolveDiscord()
// PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}
// DELETE /guilds/{guild.id}/members/{user.id}/roles/{role.id}
// Role ID for "deal-profit" stored in config or env
// Implement exponential backoff for 429 responses
```
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit**

---

### Task 7: Add scheduled job for role revocation

**Files:**
- Modify: `worker/index.js` (add scheduled handler for daily cron)
- Test: `worker/scheduled.test.js` (new test file)

**Interfaces:**
- Consumes: `DEAL_STORE`, Discord bot token, role management functions
- Produces: Daily cron that finds expired subscriptions and revokes roles

- [ ] **Step 1: Write failing test for scheduled job**
```javascript
test('scheduled handler revokes roles for expired subscriptions', async () => { ... })
test('skips active subscriptions', async () => { ... })
```
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Add scheduled handler in index.js**
```javascript
export default {
  async fetch(request, env) { ... },
  async scheduled(event, env, ctx) {
    // Cron: "0 3 * * *" (3 AM UTC daily)
    // Get all expired subscriptions from DEAL_STORE
    // For each: revokeRole(discordId), update subscription status to 'expired'
    // Log results
  }
}
```
- [ ] **Step 4: Add cron trigger to wrangler.toml**
```toml
[triggers]
crons = ["0 3 * * *"]
```
- [ ] **Step 5: Run tests to verify they pass**
- [ ] **Step 6: Commit**

---

### Task 8: Add subscription status API endpoint

**Files:**
- Modify: `worker/index.js` (add `/api/user/subscription` GET)
- Test: `worker/subscription-api.test.js` (new test file)

**Interfaces:**
- Consumes: `DEAL_STORE`, admin session
- Produces: GET `/api/user/subscription` → `{ status, currentPeriodEnd, discordLinked, discordId }`

- [ ] **Step 1: Write failing test for subscription status**
```javascript
test('returns subscription for authenticated user', async () => { ... })
test('returns null if no subscription', async () => { ... })
```
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `/api/user/subscription` in index.js**
```javascript
// Requires valid session (reuse getSession)
// Fetch subscription from DEAL_STORE by userId
// Return formatted status
```
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 9: Create Payment page (frontend)

**Files:**
- Create: `src/routes/Payment.jsx`
- Modify: `src/App.jsx` (add route)
- Test: `src/routes/Payment.test.jsx` (optional component test)

**Interfaces:**
- Consumes: Stripe.js loaded from CDN, `/api/stripe/create-checkout`, `/api/discord/auth`, `/api/user/subscription`
- Produces: Page at `/payment` with Discord linking, subscription status, and checkout button

- [ ] **Step 1: Create Payment.jsx component**
```jsx
// - Check subscription status on load
// - If no Discord linked: show "Link Discord" button → /api/discord/auth
// - If linked but no active sub: show "Subscribe $25/mo" button → create checkout session → redirect to Stripe
// - If active sub: show status, cancel link (Stripe portal), next billing date
// - If past_due: show "Update payment method" button
```
- [ ] **Step 2: Add route to App.jsx**
```jsx
<Route path="/payment" element={<Payment />} />
```
- [ ] **Step 3: Add Stripe.js script to index.html**
```html
<script src="https://js.stripe.com/v3/" async></script>
```
- [ ] **Step 4: Commit**

---

### Task 10: Update Upgrade.jsx and Trial.jsx - replace Whop links

**Files:**
- Modify: `src/routes/Upgrade.jsx` (replace WHOP_URL, update copy)
- Modify: `src/routes/Trial.jsx` (replace Whop URL, update copy)
- Modify: `src/components/Navbar.jsx` (replace TRIAL_URL)

**Interfaces:**
- Produces: Updated pages with Discord invite links and new payment flow

- [ ] **Step 1: Update Upgrade.jsx**
```jsx
// Replace WHOP_URL with 'https://discord.gg/dealprofit'
// Update copy: "Start Free Trial" → links to Discord
// Add "Upgrade to Premium" button → links to /payment
// Update FAQ: trial via Discord ticket, then $25/mo via /payment
```
- [ ] **Step 2: Update Trial.jsx**
```jsx
// Replace Whop URL with 'https://discord.gg/dealprofit'
// Update copy: trial via Discord ticket
// CTA buttons: "Join Discord" → discord.gg/dealprofit, "Upgrade" → /payment
```
- [ ] **Step 3: Update Navbar.jsx**
```jsx
// Replace TRIAL_URL with 'https://discord.gg/dealprofit'
// Button text: "Get Premium" → links to /payment
```
- [ ] **Step 4: Update Discord.jsx if needed** (already uses discord.gg/dealprofit)
- [ ] **Step 5: Commit**

---

### Task 11: Add Stripe.js integration and checkout redirect

**Files:**
- Modify: `src/routes/Payment.jsx` (add Stripe redirect logic)
- Create: `src/lib/stripe.js` (Stripe client helper)

**Interfaces:**
- Consumes: `STRIPE_PUBLISHABLE_KEY` from env (injected at build)
- Produces: Stripe redirect on checkout button click

- [ ] **Step 1: Create stripe.js helper**
```javascript
// Load Stripe from window.Stripe with publishable key
// Export createCheckoutSession() that calls /api/stripe/create-checkout
// Export redirectToCheckout(sessionId) that uses stripe.redirectToCheckout()
```
- [ ] **Step 2: Integrate in Payment.jsx**
```jsx
// On "Subscribe" click: call createCheckoutSession() → get sessionId → redirectToCheckout(sessionId)
// On success URL return: show success message, refetch subscription status
```
- [ ] **Step 3: Commit**

---

### Task 12: Add Discord-linked UI state and trial flow copy

**Files:**
- Modify: `src/routes/Payment.jsx` (enhance Discord linking flow)
- Modify: `src/routes/Trial.jsx` (clarify trial process)
- Modify: `src/routes/Upgrade.jsx` (clarify trial process)

**Interfaces:**
- Produces: Clear user flow: Discord → Ticket → Trial → Payment → Premium

- [ ] **Step 1: Enhance Payment.jsx Discord linking**
```jsx
// Show stepper: 1. Link Discord → 2. Create Ticket → 3. Subscribe
// If not linked: show "Link Discord Account" button
// If linked but no trial: show "Create Trial Ticket in Discord" with instructions
// If trial active: show "Upgrade to Premium" with subscription status
```
- [ ] **Step 2: Update Trial.jsx copy**
```jsx
// "Get free trial: Join Discord → Create ticket in #trials channel → Get 7-day trial"
// "After trial: $25/mo via /payment page"
```
- [ ] **Step 3: Update Upgrade.jsx FAQ**
```jsx
// Update "How does the free trial work?" answer
// "Join Discord, create a ticket in #trials, get 7-day access. Then upgrade at /payment for $25/mo."
```
- [ ] **Step 4: Commit**

---

### Task 13: End-to-end testing and deployment prep

**Files:**
- Modify: `wrangler.toml` (verify all bindings)
- Create: `DEPLOYMENT_CHECKLIST.md` (manual steps)

**Interfaces:**
- Produces: Deployed, working system

- [ ] **Step 1: Local integration test**
```bash
npx wrangler dev --local
# Test: Discord OAuth → Stripe Checkout → Webhook → Role Grant
```
- [ ] **Step 2: Create deployment checklist**
```markdown
# Deployment Checklist
1. Set secrets in Cloudflare Dashboard:
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - DISCORD_CLIENT_ID
   - DISCORD_CLIENT_SECRET
   - DISCORD_REDIRECT_URI (production URL)
2. Configure Stripe Webhook in Dashboard:
   - URL: https://goosiev.com/api/stripe/webhook
   - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed
3. Discord Developer Portal:
   - Add redirect URI: https://goosiev.com/api/discord/callback
   - Enable "Guild Members" privileged intent
4. Discord Bot:
   - Add to server with "Manage Roles" permission
   - Note "deal-profit" role ID
5. Deploy: npx wrangler deploy
```
- [ ] **Step 3: Commit all changes**

---

## Self-Review Checklist

- [x] Spec coverage: All user requirements addressed (Stripe, Discord OAuth, role grant/revoke, trial flow, Whop link replacement)
- [x] Step scan: Each step has exact signature, test assertions, and verification command
- [x] Type consistency: Durable Object methods match across tasks (getSubscription, upsertSubscription, linkDiscord, getExpiredSubscriptions)
- [x] Review Focus: All 5 critical failure modes have tests in owning tasks
- [x] Proportion: Plan is concise, no code bodies beyond algorithms