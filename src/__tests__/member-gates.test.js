// Gating rules for the deals feed and the review form.
//
// The rule: "is your Discord linked" is the gate. Holding the premium role is
// NOT required — plenty of members are in the server on a free trial and should
// still be able to read the feed and leave a review. These tests exist mostly to
// stop that being "helpfully" tightened later by someone who reads the gate as
// a paywall.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const walk = (dir) =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]
  );

describe('shared auth state', () => {
  it('is a single hook, not one copy per page', () => {
    // The navbar, the deals gate and the review form must agree. Three
    // independent fetches meant three spinners and possible disagreement.
    expect(read('src/lib/useAuth.js')).toContain('export function useAuth');
    for (const file of ['src/components/Navbar.jsx', 'src/routes/Deals.jsx', 'src/routes/Reviews.jsx']) {
      expect(read(file), file).toContain('useAuth');
    }
  });

  it('fails closed: an error or a 401 is treated as signed out', () => {
    const auth = read('src/lib/useAuth.js');
    expect(auth).toMatch(/res\.status === 401/);
    // Never guess signed-in. The gated views would leak on a wrong guess.
    expect(auth).toMatch(/catch\s*\{[\s\S]*?signedIn: false/);
    expect(auth).not.toMatch(/catch[\s\S]{0,200}?signedIn: true/);
  });
});

describe('deals feed gate', () => {
  it('shows a real teaser to signed-out visitors, then locks the rest', () => {
    const deals = read('src/routes/Deals.jsx');
    expect(deals).toMatch(/FREE_PREVIEW_COUNT = \d+/);
    // Signed out -> a slice, not an empty page. An empty page is the scam look.
    expect(deals).toMatch(/visible = signedIn \? filtered : filtered\.slice/);
    expect(deals).toMatch(/hiddenCount = filtered\.length - visible\.length/);
    expect(deals).toMatch(/!signedIn && hiddenCount > 0/);
  });

  it('does not leak the full deal count to signed-out visitors', () => {
    // "Showing 6 of 200 deals" advertises exactly what the lock is hiding.
    const deals = read('src/routes/Deals.jsx');
    const counter = deals.match(/\{feed\.deals\.length > 0 && \([\s\S]*?aria-live="polite"[\s\S]*?<\/p>/)?.[0] ?? '';
    expect(counter).toMatch(/signedIn \?/);
    expect(counter).toMatch(/sample deals/);
  });

  it('gates on the linked account, not the premium role', () => {
    const deals = read('src/routes/Deals.jsx');
    expect(deals).toMatch(/const \{ signedIn, signIn \} = useAuth\(\)/);
    // premiumRole must not appear as a gate condition anywhere on the page.
    expect(deals).not.toMatch(/if \(!?premiumRole\)/);
    expect(deals).not.toMatch(/\{premiumRole &&/);
  });
});

describe('review gate', () => {
  it('requires sign-in before the form is reachable', () => {
    const reviews = read('src/routes/Reviews.jsx');
    // The button itself bounces to sign-in, rather than opening a form the
    // visitor cannot submit.
    expect(reviews).toMatch(/if \(!signedIn\) return signIn\(\)/);
  });

  it('ties the posted name to the Discord account', () => {
    // A free-text name lets anyone post as anyone, which defeats the gate.
    const reviews = read('src/routes/Reviews.jsx');
    const nameField = reviews.match(/value=\{form\.name \|\| discordName\}[\s\S]{0,400}?\/>/)?.[0] ?? '';
    expect(nameField).toMatch(/readOnly/);
  });

  it('explains the gate before the visitor clicks', () => {
    const reviews = read('src/routes/Reviews.jsx');
    expect(reviews).toMatch(/Reviews are for members/);
    expect(reviews).toMatch(/!signedIn && !authLoading/);
  });
});

describe('discord sign-in surface', () => {
  it('has one reusable sign-in button', () => {
    const login = read('src/components/DiscordLogin.jsx');
    expect(login).toMatch(/api\/discord\/auth/);
    // Every surface reuses it, so the target can never drift.
    const uses = walk('src').filter(
      (f) => /\.(jsx|js)$/.test(f) && f !== 'src/components/DiscordLogin.jsx'
    );
    const importers = uses.filter((f) => read(f).includes('DiscordLogin'));
    expect(importers.length).toBeGreaterThanOrEqual(3);
  });

  it('shows sign-in state in the navbar on desktop and mobile', () => {
    const navbar = read('src/components/Navbar.jsx');
    expect(navbar).toMatch(/\{!signedIn \? \(/);
    // The username appears twice: inline pill and the mobile menu.
    expect((navbar.match(/user\?\.username/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});

describe('upgrade page clarity', () => {
  it('says what each button does before the visitor clicks it', () => {
    const upgrade = read('src/routes/Upgrade.jsx');
    expect(upgrade).toContain('What the trial button does');
    expect(upgrade).toContain('What the upgrade button does');
    expect(upgrade).toContain('What happens after you pay');
    expect(upgrade).toContain('How to cancel');
  });

  it('names the payment processor so nobody wonders where the card goes', () => {
    // The FAQ body lives in upgradeContent.js now — it is shared with the
    // search index, so that is where the wording has to be correct.
    const faq = read('src/lib/upgradeContent.js');
    expect(faq).toContain('Who holds my payment details?');
    expect(faq).toContain('Do I need a card to try it?');
    expect(read('src/routes/Upgrade.jsx')).toContain('upgradeContent');
  });
});
