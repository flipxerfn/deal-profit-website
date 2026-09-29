// Whop Pixel installation.
//
// Two things this file guards, both of which silently produce a pixel that
// looks installed and records nothing useful:
//
//   1. The snippet must stay byte-for-byte as Whop shipped it. Whop's loader
//      is minified and self-initialising; reformatting it is how it ends up
//      half-applied.
//
//   2. This is a client-side-routed SPA with a single index.html, so the
//      track("page") inside the head only fires on a hard load. /deals and
//      /upgrade — the funnel — never reload the document, so without a
//      route-change tracker Whop would only ever see whichever page a visitor
//      happened to land on.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const layout = readFileSync(resolve(root, 'src/components/Layout.jsx'), 'utf8');

// Exactly as provided in the Whop dashboard snippet, unaltered.
const WHOP_SNIPPET =
  '<script>!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");whop.setScope("biz_olEvrfdonYlloB");whop.track("page");</script>';

describe('the snippet itself', () => {
  it('is present exactly as Whop provided it', () => {
    expect(html).toContain(WHOP_SNIPPET);
  });

  it('sits inside <head>, as the docs require', () => {
    const headEnd = html.indexOf('</head>');
    expect(html.indexOf(WHOP_SNIPPET)).toBeGreaterThan(-1);
    expect(html.indexOf(WHOP_SNIPPET)).toBeLessThan(headEnd);
  });

  it('scopes to this business id and points at Whop', () => {
    expect(html).toContain('whop.setScope("biz_olEvrfdonYlloB")');
    expect(html).toContain('https://t.whop.tw');
  });

  it('fires a page event on load', () => {
    expect(html).toContain('whop.track("page")');
  });
});

describe('client-side route tracking', () => {
  it('fires a page event on every route change', () => {
    // Without this, /deals and /upgrade never register: the document is never
    // reloaded, so the head snippet's track() does not run again.
    expect(layout).toMatch(/window\.whop\.track\('page'\)/);
  });

  it('keys off the route so every page is covered', () => {
    const effect = layout.match(/const isFirstRender = useRef\(true\);([\s\S]*?)\}, \[pathname\]\);/)?.[1] ?? '';
    expect(effect, 'the route-change effect was not found').not.toBe('');
    expect(effect).toContain("window.whop?.track");
  });

  it('does not double-count the landing page', () => {
    // The head snippet already tracked it; firing again on mount would report
    // every cold load as two page views and inflate the numbers.
    expect(layout).toMatch(/isFirstRender\.current = false;\s*\n\s*return;/);
  });

  it('survives an ad blocker removing the pixel', () => {
    // Ad blockers kill t.whop.tw routinely, which leaves `whop` undefined. An
    // unguarded call would throw and take the page down with it.
    expect(layout).toMatch(/typeof window\.whop\?\.track === 'function'/);
  });
});

describe('we do not double-report Whop\'s own checkouts', () => {
  it('has no purchase or checkout event anywhere', () => {
    // Whop records every checkout view, purchase, subscription and trial on its
    // own server, and its docs are explicit: firing these yourself is rejected
    // as a duplicate. Sales run through Whop, so none of these should exist.
    const sources = ['index.html', 'src/components/Layout.jsx', 'src/lib/checkout.js'];
    for (const file of sources) {
      const src = readFileSync(resolve(root, file), 'utf8');
      for (const event of ['purchase', 'subscription', 'trial_start']) {
        const re = new RegExp(`whop\\.track\\(\\s*['"]${event}['"]`);
        expect(re.test(src), `${file} fires whop.track("${event}")`).toBe(false);
      }
    }
  });
});
