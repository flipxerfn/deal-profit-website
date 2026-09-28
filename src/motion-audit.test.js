// Task 1 RED: motionVariants must contain new keys + useScrollReveal hook must exist
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const motionPath = path.join(__dirname, 'lib', 'motion.js');
const hookPath = path.join(__dirname, 'hooks', 'useScrollReveal.js');
const motionSrc = fs.existsSync(motionPath) ? fs.readFileSync(motionPath, 'utf8') : '';
const hookSrc = fs.existsSync(hookPath) ? fs.readFileSync(hookPath, 'utf8') : '';

describe('Task 1: motion audit & spring config', () => {
  it('exports layoutSpring variant', () => {
    expect(motionSrc).toContain('layoutSpring');
  });
  it('exports pageTransition variant', () => {
    expect(motionSrc).toContain('pageTransition');
  });
  it('exports scrollReveal variant', () => {
    expect(motionSrc).toContain('scrollReveal');
  });
  it('has gentle/snappy/bouncy spring presets', () => {
    expect(motionSrc).toMatch(/gentle|snappy|bouncy/);
  });
  it('useScrollReveal hook exists and exports a function', () => {
    expect(hookSrc).toContain('export');
    expect(hookSrc).toContain('useScrollReveal');
    expect(hookSrc).toContain('IntersectionObserver');
  });
});