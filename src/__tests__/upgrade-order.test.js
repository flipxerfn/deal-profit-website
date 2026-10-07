// /upgrade is a decision page, and the decision is made by one thing: the Free
// vs Premium comparison. Someone lands here to work out whether $25 is worth
// it, and that table is the answer.
//
// It was at 58% down the page. Before it, a visitor scrolled past:
//
//   17%  hero CTA ($25 button)
//   21%  the four "what each button does" cards
//   24%  Deal Feed Setup — a $55 ONE-TIME offer
//   40%  a benefits grid restating the same four benefits as a heading
//
// The 24% is the one that actually cost money. A first-time visitor had not
// yet learned what Premium even does when they were offered a $55 product
// they had not heard of. The upsell was reaching people before the thing it
// upsells.
//
// The order is now hero -> comparison -> explainer cards -> Deal Feed Setup,
// and this test pins that. Source-level, because there is no jsdom here to
// measure rendered scroll position — the percentage check below is done by
// hand in a browser and written up in the commit.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const src = readFileSync(resolve(root, 'src/routes/Upgrade.jsx'), 'utf8');

const idx = (needle) => {
  const i = src.indexOf(needle);
  expect(i, `not found in Upgrade.jsx: ${needle}`).toBeGreaterThan(-1);
  return i;
};

describe('the comparison comes before the upsell', () => {
  const compare = idx('{/* Free vs Premium comparison with billing interval selector */}');
  const setup = idx('{/* The setup service, deliberately not competing');
  const cards = idx('should not be a mystery. Say exactly what each button does and what');
  const hero = idx('{/* Hero */}');

  it('the comparison precedes the $55/month offer', () => {
    // This is the regression: a $55 offer shown to someone who does not yet
    // know what the $25 subscription does. Deal Feed Setup is optional and
    // independent, so it reads as a trap rather than an alternative. It is
    // worse now the setup is also recurring — two unknown subscriptions on one
    // page, the larger one appearing first, is how people end up disputing.
    expect(compare, 'the $55 upsell is still above the comparison').toBeLessThan(setup);
  });

  it('the comparison precedes the four explainer cards', () => {
    // The cards answer "what happens when I click", which is a fair question
    // — just not the first one. A visitor deciding needs the difference
    // between the tiers first.
    expect(compare).toBeLessThan(cards);
  });

  it('the hero still comes first, and still carries the price', () => {
    expect(hero).toBeLessThan(compare);
    expect(src).toMatch(/Upgrade — \$25\/mo/);
    expect(src).toMatch(/Upgrade — \$200\/yr/);
  });

  it('both purchase paths are still reachable from the hero', () => {
    // Reordering must not have buried either call to action.
    expect(src).toMatch(/handleUpgrade/);
    expect(src).toMatch(/handleStartTrial/);
  });
});

describe('the upsell still reads as optional when it is reached', () => {
  it('says so outright', () => {
    expect(src).toMatch(/Optional\s*&middot;\s*\$55\/month/);
    expect(src).toMatch(/not part of Premium/i);
  });

  it('states the monthly price and that it can be cancelled', () => {
    // Two recurring products now sit on this page: Premium at $25/mo and Deal
    // Feed Setup at $55/mo. "Nothing to cancel" was true when the setup was a
    // one-off and is now false; leaving it would tell a buyer the larger of
    // the two charges is not recurring.
    expect(src).toMatch(/Deal Feed Setup &mdash; \$55\/month/);
    expect(src).toMatch(/Cancel any time, no fee/i);
    expect(src).not.toMatch(/Deal Feed Setup &mdash; \$55 once/);
  });

  it('keeps the free Discord tier honest about being free', () => {
    // "Nothing to cancel, ever" belongs HERE and must survive: the Discord tier
    // really is free. A refactor that swept that phrase away would make the
    // free option sound like a trap.
    expect(src).toMatch(/Nothing to cancel, ever/i);
  });
});
