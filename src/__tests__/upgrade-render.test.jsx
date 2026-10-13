// Renders Upgrade.jsx for real. If any identifier in it is undefined, this
// throws at import/render time instead of shipping a black screen.
//
// WHY THE EXPLICIT 20s TIMEOUT
// ----------------------------
// Vitest's default is 5s. This test does a full `renderToStaticMarkup` of the
// whole route, which on this machine measures 6-7.5s (it renders the animated
// price-swap card, the ring-spin border and the plan table from framer-motion
// and GSAP). So the test was failing on CLOCK, not on a defect — it timed out
// before it could assert anything, and every run produced zero information
// about whether the component was broken.
//
// The fix is a budget that fits the work, not a smaller job. The assertions
// are unchanged and are still checking the real render.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

describe('the three-ways-in chooser renders', () => {
  it('mounts without throwing and shows all three options', async () => {
    const mod = await import('../routes/Upgrade.jsx');
    const Up = mod.default;
    const html = renderToStaticMarkup(
      React.createElement(MemoryRouter, null, React.createElement(Up))
    );
    expect(html).toContain('Start here');
    expect(html).toContain('Join Discord');
    expect(html).toContain('Free Trial');
    expect(html).toContain('Subscribe');
  }, 20000);
});