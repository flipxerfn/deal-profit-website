// Site search ranking.
//
// The bar: someone types "cancel" and lands on "How to cancel", not on whichever
// policy section happens to mention the word first. The index is built from the
// same modules the pages render, so these tests also fail if a section is
// renamed and the search quietly stops finding it.
import { describe, it, expect } from 'vitest';
import { search, SEARCH_ENTRY_COUNT } from './search.js';
import { terms } from '../content/legal/terms';
import { privacy } from '../content/legal/privacy';
import { refunds } from '../content/legal/refunds';
import { UPGRADE_FAQS } from './upgradeContent';

const labels = (q) => search(q, 20).map((r) => r.label);
const href = (q) => search(q, 1).map((r) => `${r.to}${r.hash ?? ''}`);

describe('index coverage', () => {
  it('indexes every legal section, not just the page', () => {
    const sections =
      (terms.sections?.length ?? 0) + (privacy.sections?.length ?? 0) + (refunds.sections?.length ?? 0);
    expect(sections).toBeGreaterThan(20);
    const total = SEARCH_ENTRY_COUNT;
    // sections + 5 routes + every FAQ
    expect(total).toBe(sections + 5 + UPGRADE_FAQS.length);
  });

  it('gives every legal section its own deep link', () => {
    // The point of indexing sections is jumping straight to one. Generic words
    // like "contact" legitimately exist on more than one page, so this asserts
    // reachability rather than first position.
    for (const doc of [terms, privacy, refunds]) {
      for (const s of doc.sections ?? []) {
        const target = `/${doc.slug}#${s.id}`;
        const key = s.heading.split('.').pop().trim();
        const found = search(key, 30).map((r) => `${r.to}${r.hash ?? ''}`);
        expect(found, target).toContain(target);
      }
    }
  });
});

describe('ranking', () => {
  it('surfaces the direct answer first', () => {
    // These are the queries a paying customer actually types.
    expect(labels('cancel')[0]).toMatch(/cancel/i);
    expect(labels('refund')[0]).toMatch(/refund/i);
    expect(labels('trial')[0]).toMatch(/trial/i);
  });

  it('prefers a title match over a body-only mention', () => {
    const results = search('cancel', 20);
    const titled = results.findIndex((r) => r.label.toLowerCase().includes('cancel'));
    const bodyOnly = results.findIndex((r) => !r.label.toLowerCase().includes('cancel'));
    expect(titled).toBeGreaterThanOrEqual(0);
    if (bodyOnly !== -1) expect(titled).toBeLessThan(bodyOnly);
  });

  it('still answers a two-word query when only one word appears in the copy', () => {
    // Nothing on the site uses the word "window". Refusing to return anything
    // for "refund window" because no section says both words feels like a
    // broken search, so a partial match is returned instead.
    const results = search('refund window', 20);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].label).toMatch(/refund/i);
    for (const r of results) expect(r.matched).toBeGreaterThan(0);
  });

  it('ranks a both-words match above a one-word match', () => {
    // "free trial" does appear in the copy, so the stricter case is testable.
    const results = search('free trial', 20);
    expect(results[0].matched).toBe(2);
    const both = results.filter((r) => r.matched === 2);
    const one = results.filter((r) => r.matched === 1);
    expect(both.length).toBeGreaterThan(0);
    if (one.length) {
      expect(Math.min(...both.map((r) => r.score))).toBeGreaterThan(Math.max(...one.map((r) => r.score)));
    }
  });

  it('finds the upgrade page for commercial questions', () => {
    expect(href('upgrade')[0]).toBe('/upgrade');
    expect(href('pricing')[0]).toBe('/upgrade');
  });

  it('is case-insensitive and tolerates extra whitespace', () => {
    expect(labels('CANCEL')).toEqual(labels('cancel'));
    expect(labels('  free   trial ')).toEqual(labels('free trial'));
  });
});

describe('empty and nonsense queries', () => {
  it('returns nothing until there are two characters', () => {
    // A one-character query would match almost everything and feel broken.
    expect(search('')).toEqual([]);
    expect(search('  ')).toEqual([]);
    expect(search('c')).toEqual([]);
  });

  it('returns an empty list rather than throwing on no match', () => {
    expect(search('zzzqqqxyz')).toEqual([]);
  });

  it('respects the limit', () => {
    expect(search('a', 5)).toEqual([]);
    expect(search('the', 3).length).toBeLessThanOrEqual(3);
  });
});
