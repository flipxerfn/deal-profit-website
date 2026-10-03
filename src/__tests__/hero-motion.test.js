import { describe, it, expect } from 'vitest';
import { motionVariants, getMotionProps } from '../lib/motion.js';

describe('hero sequence variants', () => {
  it('exists and drives a stagger', () => {
    expect(motionVariants.heroSequence.animate.transition.staggerChildren).toBeGreaterThan(0);
  });
  it('only animates transform/opacity/filter', () => {
    const props = ['initial', 'animate'];
    for (const v of ['heroWord', 'heroCard', 'heroBody', 'heroTrust']) {
      for (const k of props) {
        const obj = motionVariants[v][k] || {};
        for (const key of Object.keys(obj)) {
          expect(['opacity', 'y', 'x', 'scale', 'filter', 'boxShadow'], `${v}.${k}.${key} is not paint-only`).toContain(key);
        }
      }
    }
  });
  it('reduced motion disables all of it', () => {
    const p = getMotionProps(true, motionVariants.heroCard);
    expect(p.initial).toBe(false);
    expect(p.animate).toBe(false);
  });
});
