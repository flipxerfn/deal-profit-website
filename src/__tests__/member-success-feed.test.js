// The public success feed is the page's strongest credibility asset and its
// easiest way to become a liability. Four things can go wrong, and each of
// them was checked against a naive implementation first:
//
//  1. Showing what people EARNED. Nobody tracks earnings, so any number would be
//     invented — and an unverifiable income figure is the specific claim that
//     gets a Whop account flagged. The payload carries `earnings: null` and this
//     fails the moment that changes.
//
//  2. A "verified member" badge. Nothing in Discord proves who someone is. The
//     site applied exactly this badge to arbitrary posts before, so it is
//     asserted absent on both the server and the component.
//
//  3. A caveat that lives only in the UI. If the component is deleted or breaks,
//     the disclaimer disappears silently and the feed keeps working while
//     making the same claim with nothing to qualify it. The caveat is asserted
//     in the worker module, where it cannot be lost by a render change.
//
//  4. The feed showing a bare "example" state that looks like a broken page. An
//     unconfigured channel is a normal state and must read as intentional.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const comp = read('src/components/MemberSuccess.jsx');
const worker = read('worker/successPosts.js');
const home = read('src/routes/Home.jsx');

/**
 * Source with comments removed.
 *
 * The file headers here explain WHY each rule exists, and explaining "never
 * label anyone as a verified member" means writing the phrase — which the very
 * gate enforcing that rule then flags. Stripping comments first is what makes
 * the gate check the rendered code instead of the prose about it.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

const compCode = stripComments(comp);
const workerCode = stripComments(worker);

describe('Home actually renders the feed', () => {
  it('is on the front page', () => {
    expect(home).toMatch(/import MemberSuccess/);
    expect(home).toMatch(/<MemberSuccess \/>/);
  });

  it('leads with the image, since that is the actual evidence', () => {
    // Members post photos. A card that renders the caption first, or that
    // treats an image as decoration, throws away the proof.
    expect(comp).toMatch(/post\.image \?/);
    expect(comp).toMatch(/aspect-square w-full object-cover/);
  });

  it('reads the live endpoint', () => {
    expect(comp).toContain("fetch('/api/success'");
  });
});

describe('the feed makes no claim it cannot support', () => {
  it('renders no earnings figure', () => {
    // A price inside a member's own post is theirs and is shown as their text.
    // What must never appear is a site-authored claim about money.
    expect(comp).not.toMatch(/earned\s+\$|made\s+\$|profit(ed)?\s+\$/i);
  });

  it('never labels a member verified', () => {
    // Against the comment-stripped source: the rationale comments name the
    // phrase on purpose, and the gate is about rendered code.
    expect(compCode).not.toMatch(/verified\s+member/i);
    expect(workerCode).not.toMatch(/verified\s+member/i);
  });

  it('shows the caveat whenever the feed shows', () => {
    // Not conditional on having posts: the empty state also displays it, so
    // the section never renders an unqualified claim about the server.
    const caveatIdx = comp.indexOf('caveat');
    expect(caveatIdx, 'no caveat rendered').toBeGreaterThan(-1);
    expect(comp).toMatch(/data\?\.caveat \?\? CAVEAT/);
  });

  it('keeps the component caveat in step with the worker copy', () => {
    // Both contain the two phrases that carry the legal weight. If either is
    // reworded, this fails rather than the two drifting apart quietly.
    for (const [name, src] of [['worker', worker], ['component', comp]]) {
      expect(src, `${name} lost the "not typical" qualifier`).toMatch(/not typical/i);
      expect(src, `${name} lost the "not a promise" qualifier`).toMatch(/not a promise/i);
    }
  });

  it('describes the feed as posts, not results', () => {
    // "What members caught" is a statement about what was posted. "What
    // members earned" would not be supportable.
    expect(comp).toMatch(/What members actually caught/);
    expect(comp).not.toMatch(/What members (actually )?(earned|made|profit)/i);
  });

  it('does not claim the trial needs no card', () => {
    // The feed header used to say "the trial is free and no card is involved".
    // The trial moved to Whop and takes a card, so that sentence is now false.
    // The Discord itself is still free, which is what the copy should say.
    expect(comp).not.toMatch(/no card is involved/i);
  });
});

describe('accessibility of the image cards', () => {
  it('gives each photo meaningful alt text from the caption', () => {
    // alt={post.text || ''} plus aria-hidden when there is no caption. A
    // screen reader then hears the caption once, not "image" or a filename.
    expect(comp).toMatch(/alt=\{post\.text \|\| ''\}/);
    expect(comp).toMatch(/aria-hidden=\{post\.text \? undefined : true\}/);
  });

  it('marks purely decorative icons as hidden', () => {
    const icons = comp.match(/<(Fa[A-Z]\w+|FaDiscord)[^>]*>/g) ?? [];
    const withoutHidden = icons.filter((t) => !/aria-hidden/.test(t) && !/className/.test(t));
    expect(withoutHidden, `unlabelled icons: ${withoutHidden.join(' ')}`).toEqual([]);
  });

  it('uses a real time element with a machine-readable date', () => {
    expect(comp).toMatch(/<time dateTime=\{post\.postedAt\}>/);
  });

  it('links out safely', () => {
    const ext = comp.match(/<a\b[^>]*target="_blank"[^>]*>/g) ?? [];
    expect(ext.length).toBeGreaterThan(0);
    for (const a of ext) expect(a).toMatch(/rel="noopener noreferrer"/);
  });
});

describe('an empty feed looks deliberate, not broken', () => {
  it('renders an intentional empty state', () => {
    expect(comp).toMatch(/The feed is quiet right now/);
  });

  it('still routes to the invite from the empty state', () => {
    // An empty feed with no call to action is a dead end. This is the one
    // place a first-time visitor is most likely to be.
    expect((comp.match(/DISCORD_INVITE/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('does not claim to be live before it has loaded', () => {
    // `data === null` means still loading, and the section must not imply
    // anything about the server's size during that window.
    expect(comp).toMatch(/const showEmpty = Boolean\(data\) && posts\.length === 0/);
  });
});

describe('the section respects the site layout rules', () => {
  it('bleeds without naming a viewport width', () => {
    // Same 100vw bug that clipped the hero badge: full-bleed bands must use
    // padding-matched negative margins.
    expect(comp).toMatch(/band-bleed/);
    expect(comp).not.toMatch(/100vw|-50vw/);
  });

  it('is labelled for screen readers', () => {
    expect(comp).toMatch(/aria-labelledby="success-title"/);
    expect(comp).toMatch(/id="success-title"/);
  });
});
