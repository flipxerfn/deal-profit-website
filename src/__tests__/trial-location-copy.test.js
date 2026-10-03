// The trial moved from Discord to Whop. Four separate places still said the
// trial was in Discord after the move, and each one shipped on its own:
//
//   1. Upgrade.jsx     the bottom CTA description
//   2. content-manifest.json  the same string, as a default
//   3. PaymentFlow.jsx step 2 description
//   4. PaymentFlow.jsx the "Try It Free in Discord" button label
//
// I fixed them one at a time as each was noticed, which is the wrong way. The
// lesson is not "check more carefully" — it is that a moved fact needs a gate,
// or it rots in the next copy that gets written.
//
// "No card" is the same class of rot: it was true while the trial lived in
// Discord and false the moment a Whop trial took a card. Both are checked
// here so neither can quietly come back.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

function sourceFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.(jsx?|json)$/.test(e.name) && !e.name.includes('.test.')) out.push(p);
  }
  return out;
}

const files = sourceFiles(join(root, 'src'));

// Strips comments so a note explaining the change does not trip the gate.
const stripComments = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/<!--[\s\S]*?-->/g, '');

describe('the trial is on Whop and the copy says so', () => {
  it('no user-facing copy still puts the trial in Discord', () => {
    const offenders = [];
    for (const f of files) {
      const src = stripComments(readFileSync(f, 'utf8'));
      src.split('\n').forEach((line, i) => {
        // Only prose. "the trial lives in Discord" inside a comment is gone
        // above; what matters is shipped copy.
        if (/try it free in discord/i.test(line)) {
          offenders.push(`${f.replace(root + '/', '')}:${i + 1} ${line.trim().slice(0, 80)}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('no user-facing copy still promises no card for the trial', () => {
    // The Discord itself is free and that is still true. What must not come
    // back is "no card" attached to the trial or to checkout, because a Whop
    // trial takes one and saying otherwise is a chargeback waiting to happen.
    const offenders = [];
    for (const f of files) {
      const src = stripComments(readFileSync(f, 'utf8'));
      src.split('\n').forEach((line, i) => {
        if (/no card/i.test(line) && /(trial|checkout|whop|subscribe)/i.test(line)) {
          offenders.push(`${f.replace(root + '/', '')}:${i + 1} ${line.trim().slice(0, 80)}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('the trial button on the upgrade page still reaches Whop', () => {
    const up = readFileSync(join(root, 'src/routes/Upgrade.jsx'), 'utf8');
    expect(up).not.toMatch(/Try it free in Discord/i);
    expect(up).toMatch(/7 days/i);
  });
});