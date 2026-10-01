// Feed images that are not product photos.
//
// What is actually in the feed
// ----------------------------
// All 178 images on the live feed were probed. 28 of them are byte-for-byte
// 1920x1290 — the exact canvas the source deal bot uses for a full-page
// Amazon capture. They are not cropped product shots; they are browser
// screenshots containing the Amazon nav bar, the seller list, the breadcrumbs
// and the item-details accordion.
//
// Two of them also republish someone else's home address (an Amazon
// "Deliver to ... 92551" banner) and carry a FLIP.com watermark across the
// middle. That is a third party's address and a third party's brand, on a
// storefront that has to survive a payment-provider review.
//
// Why this is fixed in the browser and not the Worker
// ----------------------------------------------------
// The obvious fix is to reject the URL server-side. That does not work: 65
// perfectly good product photos come from the same Discord CDN, so the host
// does not discriminate. The only reliable signal is the pixel dimensions,
// and the Worker cannot know those without fetching and decoding all 178
// images on every feed request.
//
// The browser already knows them. naturalWidth and naturalHeight are free once
// the image has loaded, which it was going to do anyway.
//
// Why it matches exact dimensions and not aspect ratio
// -----------------------------------------------------
// 1920/1290 is 1.488. A normal 3:2 photograph is 1.5. Any ratio threshold that
// catches the screenshots also catches good photos, which is why the first
// instinct — "reject anything wider than 2:1", the same rule used for the
// video renderer — cannot be reused here and would have quietly removed real
// product imagery.
//
// The signal that does work is exactness. All 28 captures are 1920x1290 to the
// pixel because they come off one automated canvas. A genuine product
// photograph landing on those two numbers to within a pixel or two is not a
// coincidence worth betting on, and being wrong in this direction costs a
// placeholder rather than a missing deal.
import { describe, it, expect } from 'vitest';
import { isNonProductImage } from '../lib/imageQuality.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const card = readFileSync(resolve(import.meta.dirname, '../components/DealCard.jsx'), 'utf8');

describe('the fingerprint is the bot canvas, not the aspect ratio', () => {
  it('rejects the exact browser-capture size', () => {
    expect(isNonProductImage(1920, 1290)).toBe(true);
  });

  it('tolerates a pixel or two of resampling', () => {
    // Proxies and CDNs resample. An exact-equality check would miss those and
    // the capture would slip back onto the page.
    expect(isNonProductImage(1918, 1292)).toBe(true);
    expect(isNonProductImage(1922, 1288)).toBe(true);
  });

  it('keeps ordinary product photographs', () => {
    for (const [w, h] of [[1000, 1000], [500, 500], [400, 400], [1080, 1080], [1920, 1440]]) {
      expect(isNonProductImage(w, h), `${w}x${h} was wrongly rejected`).toBe(false);
    }
  });

  it('does not reject on ratio alone', () => {
    // 1920x1290 is 1.488 and a 3:2 photo is 1.5. These are effectively the
    // same shape and only one of them is junk, which is the whole reason the
    // video renderer's 2.0 ceiling cannot be copied here.
    expect(isNonProductImage(1500, 1008)).toBe(false); // 1.488, a real photo shape
    expect(isNonProductImage(1920, 1290)).toBe(true);  // same ratio, but the canvas
  });

  it('rejects the Keepa chart size', () => {
    // 5 of 178. A price-history graph where a product should be.
    expect(isNonProductImage(500, 200)).toBe(true);
  });

  it('ignores garbage dimensions', () => {
    for (const [w, h] of [[0, 0], [NaN, 100], [100, NaN], [undefined, undefined], [null, 100]]) {
      expect(isNonProductImage(w, h)).toBe(false);
    }
  });
});

describe('DealCard drops the image at render time, with no extra request', () => {
  it('checks the loaded image rather than fetching its size', () => {
    // naturalWidth is free — the image already loaded to be displayed.
    // Asking the Worker for dimensions would mean 178 extra fetches per page.
    expect(card).toMatch(/naturalWidth|naturalHeight/);
  });

  it('falls back to the placeholder instead of showing a browser capture', () => {
    expect(card).toMatch(/isNonProductImage/);
  });

  it('stops rendering the capture once it is identified', () => {
    // Asserted on the mechanism, not a variable name. The first version named
    // three specific setters and rejected a correct implementation that used a
    // fourth, which is a gate testing spelling rather than behaviour.
    expect(card).toMatch(/set\w+\((true|false|null)\)/);
    // And the flag has to gate the render, not just be set.
    expect(card).toMatch(/const showImage = [^;]*!hideImage|!hideImage/);
    expect(card).toMatch(/\{showImage \? \(/);
  });

  it('leaves the alt text alone rather than describing a screenshot', () => {
    // The alt text is the product name. It stays accurate whether or not an
    // image renders.
    expect(card).not.toMatch(/alt="[^"]*screenshot/i);
  });
});