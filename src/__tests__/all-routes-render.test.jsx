// Every route must mount. A blank page on /upgrade shipped twice today because
// an undefined identifier throws at render time — vite build does not evaluate
// components, and a substring grep cannot tell a used-but-undefined handler
// from a defined one. Actually mounting is the only check that works.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

const PAGES = [
  ['Home', () => import('../routes/Home.jsx')],
  ['Deals', () => import('../routes/Deals.jsx')],
  ['Reviews', () => import('../routes/Reviews.jsx')],
  ['Discord', () => import('../routes/Discord.jsx')],
  ['Upgrade', () => import('../routes/Upgrade.jsx')],
];

describe('every page renders', () => {
  for (const [name, load] of PAGES) {
    it(`${name} mounts without throwing`, async () => {
      const mod = await load();
      const html = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          null,
          React.createElement(
            Routes,
            null,
            React.createElement(Route, { path: '*', element: React.createElement(mod.default) })
          )
        )
      );
      expect(html.length).toBeGreaterThan(500);
    });
  }
});
