import { useCallback, useRef } from 'react';

/**
 * A card whose border glow follows the cursor.
 *
 * WHY A COMPONENT AND NOT JUST THE `.glow-cursor` CLASS
 * -----------------------------------------------------
 * The CSS only knows how to paint a radial gradient at (--glow-x, --glow-y).
 * Something has to write those two custom properties. The obvious thing is a
 * `onMouseMove` per card — which works, and is wrong at scale: on a grid of
 * 200 deal cards that is 200 listeners and 200 pointermove reads per frame
 * across the document, for a hover that most readers perform on three cards
 * in their entire visit.
 *
 * So the handler lives here, on the container, and it reads the event's own
 * target. One listener, one rect read, per pointermove over the group. The
 * card writes the properties directly and never re-renders — these are CSS
 * custom properties, so the paint is a style recalc on one pseudo-element,
 * not a React render.
 *
 * SCOPE
 * -----
 * This is deliberately NOT applied to the deal grid. A gradient border that
 * tracks the cursor is a nice touch on the four pillar cards and the pricing
 * cards. On a 200-card feed it is 200 composited pseudo-elements for a hover
 * most readers experience a handful of times. "Cards glow on hover" and "the
 * feed stays fast" are different goals, and speed wins on the feed.
 *
 * REDUCED MOTION
 * -------------
 * The listener is still attached under reduced motion — it writes custom
 * properties, and nothing about that is motion. The CSS transition on the
 * pseudo-element is what gets switched off, so the glow appears instantly
 * rather than travelling to the cursor.
 */
export default function GlowCard({ as: Tag = 'div', className = '', children, ...rest }) {
  const groupRef = useRef(null);

  const handleMove = useCallback((event) => {
    // Read the rect once, from the card actually under the pointer. Using the
    // group's rect here is the common bug: the offset would be wrong for every
    // card except the first.
    const card = event.target.closest?.('[data-glow-card]');
    if (!card) return;

    const rect = card.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    card.style.setProperty('--glow-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
    card.style.setProperty('--glow-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  return (
    <Tag
      ref={groupRef}
      // `select-none` stops a drag from selecting card text on the way past,
      // which is what makes naive cursor-follow effects feel cheap.
      className={`glow-cursor select-none ${className}`.trim()}
      onMouseMove={handleMove}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * The part that opts a single card in.
 *
 * Kept separate so the handler can be attached once per group while each card
 * still carries its own `data-glow-card` hook. Without the attribute the
 * handler has no way to tell which card the pointer is over, because
 * `event.target` is frequently the card's inner text node rather than the
 * card element itself.
 */
export function GlowCardItem({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag data-glow-card className={className} {...rest}>
      {children}
    </Tag>
  );
}