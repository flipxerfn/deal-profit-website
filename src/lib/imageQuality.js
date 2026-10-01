// Rejecting feed images that are not product photographs.
//
// Every rule here was derived from probing all 178 images on the live feed, not
// from guessing. See the test file for the full account; the short version is
// that 28 of them are byte-for-byte 1920x1290 full-page Amazon captures —
// browser chrome, seller list, breadcrumbs, and on some a third party's home
// address and a FLIP.com watermark.

/**
 * Exact canvases that mean "automated capture", not "product photo".
 *
 * Keyed on exact pixel dimensions with a small tolerance, NOT on aspect ratio.
 * That distinction is the whole design:
 *
 *   1920/1290 = 1.488     a browser capture
 *   1500/1008 = 1.488     a perfectly ordinary photograph
 *
 * A ratio rule cannot separate those two, and reusing the 2.0 ceiling from the
 * video renderer here would have deleted real product imagery from the grid.
 *
 * The captures are all one canvas because they come off one automated
 * screenshotter, so exactness is available as a signal. Being wrong in this
 * direction costs a placeholder, not a deal.
 */
const CAPTURE_CANVASES = [
  [1920, 1290], // full-page Amazon capture — the bot's screenshot canvas
  [500, 200],   // Keepa price-history chart
];

const TOLERANCE = 4; // resampling in transit must not let one back through

/**
 * @param {number} naturalWidth  img.naturalWidth
 * @param {number} naturalHeight img.naturalHeight
 * @returns {boolean} true when the image should not be shown as a product photo
 */
export function isNonProductImage(naturalWidth, naturalHeight) {
  const w = Number(naturalWidth);
  const h = Number(naturalHeight);

  // A missing or broken image is not a reason to reject. The <img> error
  // handler deals with that, and treating 0x0 as junk here would hide the
  // placeholder path behind a confusing second failure.
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return false;

  return CAPTURE_CANVASES.some(
    ([cw, ch]) => Math.abs(w - cw) <= TOLERANCE && Math.abs(h - ch) <= TOLERANCE
  );
}