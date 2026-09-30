import { writeFileSync } from 'node:fs';

// Minimal PDF writer. No deps: these are plain text documents, and pulling in
// a PDF library for two files is not worth the install.
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function pdf(lines, title) {
  const W = 612, H = 792, ML = 64, MT = 64;
  const LH = 15.5, FONT = 10.5;
  let y = H - MT;
  const ops = [];
  const put = (text, size = FONT, gap = 4) => {
    // Wrap on width, not character count — the copy has long paragraphs.
    const max = Math.floor((W - ML * 2) / (size * 0.5));
    const words = String(text).split(/\s+/);
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > max) { push(line, size); line = w; }
      else line = (line + ' ' + w).trim();
    }
    if (line) push(line, size);
    function push(l, s) {
      if (y < MT + 40) { ops.push('0 0 0 rg'); ops.push(`${ML} ${MT} m ${W - ML} ${MT} l S`); y = H - MT; }
      y -= s * 1.32 + gap;
      ops.push('BT /F1 ' + s + ' Tf ' + ML + ' ' + y.toFixed(1) + ' Td (' + esc(l) + ') Tj ET');
    }
  };

  y = H - MT;
  put(title, 17, 12);
  ops.push(`${ML} ${y - 6} m ${W - ML} ${y - 6} l 0.8 0.25 0.36 RG 1.2 w S`);
  y -= 20;
  for (const item of lines) {
    if (item.h) { y -= 8; put(item.h, 12, 5); }
    else if (item.b) { y -= 3; put('• ' + item.b, FONT, 3); }
    else if (item.sp) { y -= 9; }
    else put(item.t, FONT, 5);
  }

  const content = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += String(off).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}
export { pdf };
