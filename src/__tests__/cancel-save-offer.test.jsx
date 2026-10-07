// The save offer, and the codes behind it.
//
// This block only earns its place if two things are true at once: the offer is
// visible to someone about to leave, and the discount it promises is real.
// A 50%-off block next to zero valid codes is worse than no block — it reads as
// a tactic, which is exactly the impression the rest of the site works against.
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import CancelSaveOffer, { CANCEL_SAVE_CODES } from '../components/CancelSaveOffer.jsx';

const html = renderToStaticMarkup(
  <MemoryRouter>
    <CancelSaveOffer />
  </MemoryRouter>
);

describe('the save offer reaches the person it is for', () => {
  it('mounts', () => {
    expect(html.length).toBeGreaterThan(300);
  });

  it('offers the discount in the first paragraph', () => {
    expect(html).toMatch(/leaving because of the price/i);
    expect(html).toMatch(/50% off for three months/i);
  });

  it('tells them cancelling is genuinely fine', () => {
    // The offer is worthless if the exit feels blocked. A reader who suspects
    // a trap here will pay rather than risk a fight, and will not review you.
    expect(html).toMatch(/completely fine/i);
    expect(html).toMatch(/keep access until the end of the period/i);
  });

  it('does not claim the offer is automatic', () => {
    // Whop has no outbound email. Copy implying people are automatically saved
    // would be a promise the platform cannot keep.
    expect(html).not.toMatch(/automatically (offered|saved|applied)/i);
    expect(html).not.toMatch(/we.ll (email|send) you/i);
  });
});

describe('codes are finite and one-use', () => {
  it('has twelve codes', () => {
    expect(CANCEL_SAVE_CODES).toHaveLength(12);
  });

  it('every code is unique and recognisable', () => {
    expect(new Set(CANCEL_SAVE_CODES).size).toBe(12);
    for (const c of CANCEL_SAVE_CODES) {
      expect(c).toMatch(/^SAVEHALF\d{1,2}$/);
    }
  });

  it('never publishes the codes themselves on the page', () => {
    // Publishing them would hand every reader the same code and make the offer
    // worthless within one forum post. The page states the count, not the list.
    for (const c of CANCEL_SAVE_CODES) {
      expect(html).not.toContain(c);
    }
  });

  it('states the remaining count so scarcity is not a guess', () => {
    expect(html).toContain(String(CANCEL_SAVE_CODES.length));
  });
});

describe('the offer cannot be mistaken for the cancel path', () => {
  it('still links to billing for someone who declines', () => {
    // Removing the exit is how a discount becomes coercive.
    expect(html).toMatch(/cancel on whop/i);
  });
});
