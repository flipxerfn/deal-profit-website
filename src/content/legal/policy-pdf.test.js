// Renders the legal documents to the PDFs Whop attaches to a dispute.
//
// Whop's dispute flow pulls `terms_of_service` and `cancellation_policy` from
// the account and attaches them as evidence. Both were null, so a chargeback
// fell back to generic Whop boilerplate instead of this policy — which is the
// policy that explains a member keeps access to the end of the period they
// paid for. That is exactly the argument that wins a "I didn't get anything"
// dispute, and it was not being made for us.
//
// This writes the files rather than only asserting on them, so the upload step
// has something real to attach. Vitest is the build context: the legal modules
// use extensionless relative imports, which only the bundler resolves.
import { describe, it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pdf } from '../../../scripts/legal-pdf.mjs';
import { terms } from './terms.js';
import { privacy } from './privacy.js';
import { refunds } from './refunds.js';

const OUT = '/home/phillip/.whop-policies';
mkdirSync(OUT, { recursive: true });

function toLines(doc) {
  const out = [];
  if (doc.intro) out.push({ t: doc.intro });
  if (doc.updated) out.push({ sp: 1 }, { t: `Last updated: ${doc.updated}` });
  for (const s of doc.sections ?? []) {
    out.push({ sp: 1 }, { h: s.heading });
    for (const b of s.body ?? []) out.push({ t: b });
    for (const l of s.list ?? []) out.push({ b: l });
  }
  return out;
}

describe('whop dispute evidence', () => {
  it('writes the three policy PDFs', () => {
    const docs = [
      ['terms-of-service', terms, 'Deal Profit - Terms of Service'],
      ['privacy-policy', privacy, 'Deal Profit - Privacy Policy'],
      ['refund-cancellation-policy', refunds, 'Deal Profit - Refund and Cancellation Policy'],
    ];
    for (const [name, doc, title] of docs) {
      const body = pdf(toLines(doc), title);
      const path = `${OUT}/${name}.pdf`;
      writeFileSync(path, body, 'latin1');
      // A truncated PDF would be attached as evidence and fail to open.
      if (!body.startsWith('%PDF-1.4') || !body.trimEnd().endsWith('%%EOF')) {
        throw new Error(`${name}.pdf is malformed`);
      }
      console.log(`  ${name}.pdf  ${body.length} bytes`);
    }
  });
});
