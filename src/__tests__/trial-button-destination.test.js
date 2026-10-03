// Every "Start Free Trial" control must reach the trial, wherever it sits.
//
// This exists because the trial moved from Discord to Whop and the homepage's
// two "Start Free Trial" buttons were missed. They kept sending people to a
// Discord server that no longer had a trial in it. Every other gate stayed
// green: the build passed, 452 tests passed, and the string "Start Free Trial"
// was present in the file. What broke was not the code, it was the promise —
// the button said one thing and the href did another, which no assertion was
// checking.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.jsx')) out.push(p);
  }
  return out;
}

// Pull each "Start Free Trial" occurrence together with the JSX element it sits
// in, so the href / onClick on that element can be inspected.
function trialButtons(src) {
  const out = [];
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!/Start Free Trial/.test(line)) return;
    // Walk backwards to the opening tag of the element (button or Link).
    for (let j = i; j >= 0 && j > i - 12; j--) {
      const m = lines[j].match(/<(button|Link|a)\b/);
      if (m) {
        const chunk = lines.slice(j, i + 1).join('\n');
        out.push({ tag: m[1], chunk, line: j + 1 });
        break;
      }
    }
  });
  return out;
}

describe('trial buttons lead to the trial', () => {
  const files = walk(join(root, 'src'));

  it('finds the trial buttons at all', () => {
    const total = files.reduce(
      (n, f) => n + trialButtons(readFileSync(f, 'utf8')).length,
      0
    );
    expect(total).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.replace(root + '/', '');
    const buttons = trialButtons(readFileSync(file, 'utf8'));
    if (!buttons.length) continue;

    for (const b of buttons) {
      it(`${rel}:${b.line} does not send the trial to Discord`, () => {
        expect(
          b.chunk,
          'A "Start Free Trial" control must not point at the Discord invite. ' +
            'The trial lives on Whop now; the Discord server does not have one.'
        ).not.toMatch(/discord\.gg/);
      });
    }
  }

  it('the homepage trial button reaches the upgrade page', () => {
    const home = readFileSync(join(root, 'src/routes/Home.jsx'), 'utf8');
    const buttons = trialButtons(home);
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(b.chunk, `Home.jsx:${b.line} trial button`).toMatch(
        /to="\/upgrade"|handleStartTrial/
      );
    }
  });
});