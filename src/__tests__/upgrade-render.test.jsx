// Renders Upgrade.jsx for real. If any identifier in it is undefined, this
// throws at import/render time instead of shipping a black screen.
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
  });
});
