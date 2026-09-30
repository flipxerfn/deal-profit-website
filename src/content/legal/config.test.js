// The legal pages went live with unfilled template placeholders visible to the
// public: goosiev.com/terms and goosiev.com/privacy both rendered
// "[Business address — add before going live]" and
// "[Your state / country of residence]".
//
// A note-to-self on a published legal page is worse than having no legal page,
// because it tells a reader the documents were never reviewed. And it blocked
// generating the Whop policy PDFs, since those would have carried the same
// placeholders into dispute evidence — Whop attaches those documents when a
// chargeback is filed, and "add before going live" helps nobody.
//
// Resolved 30 September 2026: Deal Profit, New York, United States. No street
// address is published; a contact email and a named jurisdiction are enough,
// and a home address does not belong on a public page.
import { describe, it, expect } from 'vitest';
import { terms } from './terms.js';
import { privacy } from './privacy.js';
import { refunds } from './refunds.js';
import {
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  JURISDICTION,
  COUNTRY,
  STATE,
  CONTACT_EMAIL,
  LAST_UPDATED,
} from './config.js';

const DOCS = { terms, privacy, refunds };

/** Every string a document will actually render, flattened. */
function allText(doc) {
  const out = [];
  for (const section of doc.sections ?? []) {
    for (const b of section.body ?? []) out.push(String(b));
    for (const l of section.list ?? []) out.push(String(l));
  }
  if (doc.intro) out.push(String(doc.intro));
  return out;
}

describe('no placeholder is ever published again', () => {
  it('the config holds no bracketed notes-to-self', () => {
    for (const [name, value] of Object.entries({
      BUSINESS_LEGAL_NAME,
      BUSINESS_ADDRESS,
      JURISDICTION,
      COUNTRY,
      STATE,
      CONTACT_EMAIL,
    })) {
      expect(String(value), `${name} still contains a placeholder`).not.toMatch(/\[[^\]]*\]/);
      expect(String(value), `${name} is unfilled`).not.toMatch(/TODO|add before|placeholder/i);
    }
  });

  it.each(Object.entries(DOCS))('%s renders no bracketed placeholder', (_name, doc) => {
    for (const text of allText(doc)) {
      // A literal square bracket left in prose is the tell — markdown links
      // and legal citations are not in this codebase's body copy.
      expect(text, `placeholder in ${_name}: ${text.slice(0, 80)}`).not.toMatch(/\[[A-Z][^\]]{2,50}\]/);
    }
  });

  it('an empty address line is dropped, not rendered as "Business address: ."', () => {
    // BUSINESS_ADDRESS is intentionally ''. A naive template literal would
    // produce a dangling sentence, which reads as broken rather than absent.
    for (const [name, doc] of Object.entries(DOCS)) {
      for (const text of allText(doc)) {
        expect(text, `${name} has a dangling address line`).not.toMatch(
          /Business address:\s*\./
        );
        expect(text, `${name} has a dangling address line`).not.toMatch(
          /Business address:\s*,\s*\./
        );
      }
    }
  });
});

describe('the documents name a real jurisdiction and contact', () => {
  it('states New York, United States', () => {
    expect(JURISDICTION).toMatch(/New York/);
    expect(JURISDICTION).toMatch(/United States/);
    expect(COUNTRY).toBe('United States');
    expect(STATE).toBe('New York');
  });

  it('terms and privacy both name the governing law', () => {
    expect(allText(terms).join(' ')).toMatch(/governed by the laws of the State of New York/);
    expect(allText(privacy).join(' ')).toMatch(/governed by the laws of the State of New York/);
  });

  it('every document offers a real contact address', () => {
    expect(CONTACT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    for (const [name, doc] of Object.entries(DOCS)) {
      const text = allText(doc).join(' ');
      if (name === 'refunds') continue; // refunds links out to the shared policies
      expect(text, `${name} has no contact email`).toContain(CONTACT_EMAIL);
    }
  });

  it('names the business, so the document identifies who it binds', () => {
    expect(BUSINESS_LEGAL_NAME).toBe('Deal Profit');
    for (const [name, doc] of Object.entries(DOCS)) {
      const text = [String(doc.intro ?? ''), ...allText(doc)].join(' ');
      expect(text, `${name} never names the business`).toMatch(/Deal Profit/);
    }
  });

  it('is dated, and the date is not stale', () => {
    // The pages said "September 28, 2026" while still carrying placeholders.
    expect(LAST_UPDATED).toMatch(/September 30, 2026/);
    for (const [name, doc] of Object.entries(DOCS)) {
      expect(String(doc.updated ?? ''), `${name} is stale`).toMatch(/September 30, 2026/);
    }
  });
});

describe('the policy still describes the real payment model', () => {
  // The PDFs generated from these documents get attached to chargebacks, so
  // they have to describe what actually happens: trial in Discord, no card,
  // cancel from Whop. Stale copy here is what loses a dispute.
  it('says the trial involves no card', () => {
    const text = allText(refunds).join(' ');
    expect(text).toMatch(/no card/i);
  });

  it('says cancellation happens from the Whop account', () => {
    const text = allText(refunds).join(' ');
    expect(text).toMatch(/Manage membership|Whop account/i);
  });

  it('states the actual prices', () => {
    const text = allText(refunds).join(' ');
    expect(text).toMatch(/\$25/);
    expect(text).toMatch(/\$200/);
  });
});
