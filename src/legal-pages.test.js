// Legal pages (/terms, /privacy, /refunds) must exist and cover the clauses
// card networks and Stripe require before a business can accept payments.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'content', 'legal');
const read = (name) => {
  const p = path.join(dir, `${name}.js`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
};
const terms = read('terms');
const privacy = read('privacy');
const refunds = read('refunds');

const routeFiles = ['Terms', 'Privacy', 'Refunds'].map((n) => {
  const p = path.join(path.dirname(fileURLToPath(import.meta.url)), 'routes', `${n}.jsx`);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
});

describe('legal pages', () => {
  it('ships all three policy documents', () => {
    expect(terms.length).toBeGreaterThan(500);
    expect(privacy.length).toBeGreaterThan(500);
    expect(refunds.length).toBeGreaterThan(500);
  });

  it('has a route component per policy', () => {
    routeFiles.forEach((src) => expect(src).toContain('LegalPage'));
  });

  it('states the actual prices and trial length', () => {
    // Prices/length live in config.js so the pages and checkout can't drift;
    // assert the values themselves, plus that the docs use them.
    const config = fs.readFileSync(path.join(dir, 'config.js'), 'utf8');
    expect(config).toContain("PRICE_MONTHLY = '$25'");
    expect(config).toContain("PRICE_YEARLY = '$200'");
    expect(config).toContain('TRIAL_DAYS = 7');
    const all = terms + privacy + refunds;
    expect(all).toContain('PRICE_MONTHLY');
    expect(all).toContain('PRICE_YEARLY');
    expect(all).toContain('TRIAL_DAYS');
  });

  it('covers payment processing and cancellation rights', () => {
    expect(terms).toMatch(/Stripe/);
    expect(terms).toMatch(/cancel/i);
    expect(refunds).toMatch(/cancel/i);
    expect(refunds).toMatch(/refund/i);
  });

  it('discloses collected data categories in the privacy policy', () => {
    for (const term of [
      'Discord',
      'payment',
      'technical',
      'retention',
      'third part',
    ]) {
      expect(privacy.toLowerCase()).toContain(term.toLowerCase());
    }
  });

  it('provides a contact address on every page', () => {
    for (const src of [terms, privacy, refunds]) {
      expect(src).toMatch(/CONTACT_EMAIL|support@/);
    }
  });

  it('flags the values the owner must fill in before going live', () => {
    // Business identity is unknown to us — must stay an explicit placeholder.
    expect(terms).toMatch(/BUSINESS_LEGAL_NAME/);
    expect(terms).toMatch(/JURISDICTION/);
  });
});
