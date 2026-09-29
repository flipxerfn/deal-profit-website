// Site search index.
//
// Why this exists: the legal pages alone are ~29 sections of dense policy text
// (how to cancel, refunds, what data we collect), and there is no way to land
// on a specific one from a nav menu. Someone who wants to know the refund
// window should not have to scroll.
//
// Everything is bundled as ES modules already, so the index is built from the
// same source the pages render from. That means it can never describe content
// the page doesn't have — a hand-maintained list would drift.
import { terms } from '../content/legal/terms';
import { privacy } from '../content/legal/privacy';
import { refunds } from '../content/legal/refunds';
import { UPGRADE_FAQS } from './upgradeContent';

// Routes worth surfacing on their own, beyond the section-level entries.
const ROUTES = [
  { to: '/', label: 'Home', blurb: 'What Deal Profit is and how it works.' },
  { to: '/deals', label: 'Deals', blurb: 'The live feed of price errors, penny deals and glitches.' },
  { to: '/upgrade', label: 'Upgrade', blurb: 'Pricing, the free trial, and how to subscribe.' },
  { to: '/reviews', label: 'Reviews', blurb: 'What members say about Deal Profit.' },
  { to: '/discord', label: 'Discord', blurb: 'The community server and how to join.' },
];

const asText = (body) => (Array.isArray(body) ? body.join(' ') : String(body ?? ''));

function legalEntries(doc, to) {
  return (doc.sections ?? []).map((s) => ({
    to,
    hash: `#${s.id}`,
    label: s.heading,
    blurb: asText(s.body).replace(/\s+/g, ' ').trim().slice(0, 190),
    // Policy text is the main thing people search for, so weight the heading.
    keywords: `${doc.title} ${s.heading}`,
    group: doc.title,
  }));
}

const ENTRIES = [
  ...ROUTES.map((r) => ({
    to: r.to,
    hash: '',
    label: r.label,
    blurb: r.blurb,
    keywords: `${r.label} ${r.blurb}`,
    group: 'Pages',
  })),
  ...legalEntries(terms, '/terms'),
  ...legalEntries(privacy, '/privacy'),
  ...legalEntries(refunds, '/refunds'),
  ...UPGRADE_FAQS.map((f) => ({
    to: '/upgrade',
    hash: '#faq',
    label: f.title,
    blurb: f.content.replace(/\s+/g, ' ').trim().slice(0, 190),
    keywords: `FAQ ${f.title} ${f.content}`,
    group: 'Upgrade FAQ',
  })),
];

// Pre-lowered so the hot loop never lowercases per keystroke.
const HAYSTACKS = ENTRIES.map((e) => ({
  entry: e,
  text: `${e.label} ${e.blurb} ${e.keywords ?? ''}`.toLowerCase(),
}));

/**
 * Rank entries against a query.
 *
 * Matching is per-term and scored, not all-or-nothing: someone typing "refund
 * window" should reach the refund policy even though no single section says
 * both words. Entries matching more of the query outrank entries matching
 * fewer, so this cannot degrade into "everything that mentions refund" — a
 * both-words match still sorts first. A title hit beats a body-only hit.
 */
export function search(query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = [];
  for (const { entry, text } of HAYSTACKS) {
    const label = entry.label.toLowerCase();
    let score = 0;
    let matched = 0;
    for (const term of terms) {
      if (label.startsWith(term)) {
        score += 12;
        matched += 1;
      } else if (label.includes(term)) {
        score += 8;
        matched += 1;
      } else if (text.includes(term)) {
        score += 3;
        matched += 1;
      }
    }
    // Nothing matched at all, so it is not a result.
    if (!matched) continue;
    // Reward covering more of the query.
    score += matched * 6;
    scored.push({ ...entry, score, matched });
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export const SEARCH_ENTRY_COUNT = ENTRIES.length;
