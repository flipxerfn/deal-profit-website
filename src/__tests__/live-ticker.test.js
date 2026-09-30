// The live ticker on the front page.
//
// A continuously scrolling strip is the one thing on this site that WCAG 2.2
// has something specific to say about: anything that moves for more than five
// seconds needs a way to pause it. This is not a nicety — auto-scrolling
// content that cannot be stopped is a named failure mode, and the mitigation
// has to be reachable by keyboard, not just by hovering with a mouse.
//
// There is no jsdom in this project, so these are source-level gates in the
// same style as the rest of the suite. Comments are stripped before every
// assertion, because this file's own header and the component's inline
// comments mention the very patterns being asserted — a raw scan matches the
// prose and passes with the bug in place.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The text of the brace-balanced block that starts at `marker`.
 *
 * A regex like /@keyframes x \{[\s\S]*?\}/ is wrong here and quietly so: the
 * first `}` it finds closes an INNER rule, not the block. Asking for the
 * `-50%` inside a keyframe returns the region between `{` and the end of the
 * `from {` rule, which does not contain it, and the gate fails for a reason
 * that has nothing to do with the code. Three of these assertions did exactly
 * that on the first run. Counting braces is the only version that means what it
 * says.
 */
function blockAfter(source, marker, from = 0) {
  // `from` is required for repeated markers. indexOf always returns the FIRST
  // occurrence, so iterating a match list and calling this without an offset
  // returns the same block every time — which is how the reduced-motion gate
  // ended up inspecting line 105's query and never line 352's.
  const start = source.indexOf(marker, from);
  if (start === -1) return null;
  const open = source.indexOf('{', start);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return null;
}

/** Every brace-balanced block that starts with `marker`, in file order. */
function blocksStartingAt(source, marker) {
  const out = [];
  let from = 0;
  for (;;) {
    const start = source.indexOf(marker, from);
    if (start === -1) return out;
    const block = blockAfter(source, marker, start);
    if (!block) return out;
    out.push(block);
    from = start + block.length;
  }
}

const read = (rel) =>
  readFileSync(resolve(import.meta.dirname, rel), 'utf8')
    // Strip block and line comments so a gate can never match its own
    // explanation of itself.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const ticker = read('../components/LiveTicker.jsx');
const css = read('../index.css');
const home = read('../routes/Home.jsx');

describe('the strip can be stopped', () => {
  it('stops entirely under reduced motion, not just slows down', () => {
    // The preference must gate whether the animation is applied at all.
    // "Animates slower" is still a failure of the preference.
    expect(ticker).toMatch(/useReducedMotion/);
    const gate = ticker.match(/const allowMotion = [^;]+;/);
    expect(gate?.[0], 'motion gate not found').toBeTruthy();
    expect(gate[0]).toMatch(/prefersReduced/);
  });

  it('pausing freezes the strip in place instead of resetting it', () => {
    // This is a bug that only a live browser could find, and it is the reason
    // the motion gate is separate from the pause state.
    //
    // The first version used one flag for both: `run = !prefersReduced &&
    // !paused`, and applied the animation only when it was true. Pausing then
    // REMOVED the animation, which dropped the transform to none and snapped
    // the track from -1833px back to 0 — restarting the whole scroll every time
    // a mouse touched the strip. A pause control that teleports the content it
    // is pausing is worse than not having one.
    //
    // So the animation must stay applied while paused, and the freeze must come
    // from animation-play-state. Asserted structurally, because there is no DOM
    // to measure here.
    const style = ticker.match(/style=\{[\s\S]*?\n\s*\}/);
    expect(style?.[0], 'inline style block not found').toBeTruthy();
    expect(style[0], 'the animation is not applied unconditionally when motion is allowed')
      .toMatch(/allowMotion/);
    expect(style[0]).toMatch(/animationPlayState: paused \? 'paused' : 'running'/);
    // The pause flag must NOT gate the animation itself.
    expect(style[0]).not.toMatch(/allowMotion[^\n]*paused/);
  });

  it('has a real pause control, not hover-only', () => {
    // Hover is not an accessible pause mechanism: a keyboard user never
    // triggers it, so the content they are reading keeps moving. WCAG 2.2
    // (2.2.2) requires a mechanism the user can operate.
    expect(ticker).toMatch(/<button/);
    expect(ticker).toMatch(/aria-pressed=\{paused\}/);
  });

  it('is large enough to hit, on desktop and on a phone', () => {
    // Measured live at 390px wide: the first version rendered 53x21px, which is
    // under the 24x24px floor in WCAG 2.2 AA 2.5.8 (Target Size, Minimum). A
    // control you are required to provide should not be smaller than the
    // minimum that makes a target reliably hittable.
    const btn = ticker.match(/<button[\s\S]*?<\/button>/);
    expect(btn?.[0], 'pause button not found').toBeTruthy();
    expect(btn[0], 'the pause button has no minimum height').toMatch(/min-h-\[(\d+)px\]/);
    const minH = Number(btn[0].match(/min-h-\[(\d+)px\]/)[1]);
    expect(minH, `pause button min-height is ${minH}px, needs to be >= 24`).toBeGreaterThanOrEqual(24);
    // Horizontal padding so the whole control is the target, not just the word.
    expect(btn[0]).toMatch(/px-(\d+)/);
  });

  it('shows a visible focus ring, since it is keyboard reachable', () => {
    const btn = ticker.match(/<button[\s\S]*?<\/button>/);
    expect(btn[0]).toMatch(/focus-visible:outline/);
  });

  it('pauses on hover as well, for pointer users', () => {
    expect(ticker).toMatch(/onMouseEnter=\{\(\) => setPaused\(true\)\}/);
    expect(ticker).toMatch(/onMouseLeave=\{\(\) => setPaused\(false\)\}/);
  });

  it('is also covered in CSS, for when the component has not hydrated', () => {
    // Belt and braces. The JS check needs a render; the stylesheet ships in
    // the initial CSS. Someone who sets the preference at the OS level gets a
    // static strip either way.
    // The reduced-motion query for the ticker may be the first such query in
    // the file or a later one, so every block is searched, not just the first.
    const withTicker = blocksStartingAt(css, '@media (prefers-reduced-motion: reduce)')
      .filter((b) => b.includes('ticker-track'));
    expect(withTicker.length, 'ticker-track is not inside a reduced-motion query').toBeGreaterThan(0);
    expect(withTicker[0]).toMatch(/animation:\s*none/);
    expect(withTicker[0]).toMatch(/transform:\s*none/);
  });
});

describe('a screen reader hears each find once', () => {
  it('hides the duplicate copy of the strip from assistive tech', () => {
    // The list is rendered twice to make the loop seamless. Without
    // aria-hidden on the second copy, a screen reader user hears the whole
    // strip twice, back to back, and has no way to tell that is not the point.
    //
    // Asserted on the DUPLICATE wrapper specifically, not on any aria-hidden in
    // the file — the edge-fade overlays are aria-hidden too, so a loose match
    // passes even if the duplicate copy is fully exposed.
    const dup = /<div aria-hidden="true" className="flex items-center gap-3">/.test(ticker);
    expect(dup, 'the duplicate strip copy is not aria-hidden').toBe(true);
    expect(ticker).toMatch(/decorative \? \{ 'aria-hidden': true \} : \{\}/);
  });

  it('offers a static route to the same content', () => {
    // Motion is the only way to see everything in the strip, which makes it
    // inaccessible to anyone the motion is disabled for. The sentence below
    // the strip is the non-motion equivalent.
    expect(ticker).toMatch(/sr-only/);
    expect(ticker).toMatch(/<Link to="\/deals"/);
  });
});

describe('the loop has no seam and no gap', () => {
  it('animates by exactly -50%, which only works with two copies', () => {
    // The track holds the item list twice. Translating by half the track
    // width puts the second copy exactly where the first began, so there is
    // no visible jump. Any other value leaves a gap or a stutter.
    const kf = blockAfter(css, '@keyframes ticker-scroll');
    expect(kf, 'ticker-scroll keyframes missing').toBeTruthy();
    expect(kf).toMatch(/-50%/);
  });

  it('animates a transform, not a layout property', () => {
    // Animating `left` moves the strip through layout on every frame. This is
    // the difference between a compositor-only animation and one that janks.
    const kf = blockAfter(css, '@keyframes ticker-scroll');
    expect(kf).toMatch(/transform:\s*translate3d/);
  });

  it('does not animate `left` or `margin`, which run through layout', () => {
    const kf = blockAfter(css, '@keyframes ticker-scroll');
    expect(kf).not.toMatch(/\bleft\s*:/);
    expect(kf).not.toMatch(/\bmargin\s*:/);
  });
});

describe('an empty strip is not a strip', () => {
  it('renders nothing rather than a bordered empty bar', () => {
    // The section has a top border. Rendered with no items it is a 1px line
    // across the page saying nothing.
    expect(ticker).toMatch(/if \(!ready \|\| items\.length < 2\) return null;/);
  });

  it('waits for the fetch before deciding', () => {
    // Without `ready`, the first render returns null and the strip pops in a
    // moment later — a visible flash on every page load.
    expect(ticker).toMatch(/finally\s*\{[\s\S]*?setReady\(true\)/);
  });
});

describe('it is on the front page', () => {
  it('Home imports and renders it', () => {
    expect(home).toMatch(/import LiveTicker from '\.\.\/components\/LiveTicker'/);
    expect(home).toMatch(/<LiveTicker \/>/);
  });
});

describe('it is honest about where the data comes from', () => {
  it('reads the live feed rather than a hard-coded list', () => {
    // A strip of made-up finds is the exact thing the rest of this site is
    // built to avoid — the live hero feed went through a whole revision
    // because it was showing archived examples as if they were current.
    expect(ticker).toMatch(/fetch\(ENDPOINT/);
    expect(ticker).toMatch(/const ENDPOINT = '\/api\/deals'/);
  });

  it('promotes nothing it cannot link to', () => {
    // A find the reader cannot open is not a find. Same filter the hero feed
    // uses.
    expect(ticker).toMatch(/isSourceLink/);
  });

  it('keeps the label to what the data supports', () => {
    // "Caught just now" on a strip of items up to hours old is a claim the
    // page cannot back. Each item renders its real age, which is why the
    // heading can afford to be small.
    expect(ticker).toMatch(/Caught just now/);
    expect(ticker).toMatch(/timeAgo\(deal\.postedAt\)/);
  });
});
