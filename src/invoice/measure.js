import { PDF_FONTS } from '../pdf/fontMetrics.js';

/** Width in px of `text` in a Text slot's font, from the same widths the PDF uses. */
export function measureText(text, { font, size, bold = false, italic = false }) {
  const weight = bold ? '-bold' : '';
  const key = [`${font}${weight}${italic ? '-italic' : ''}`, `${font}${weight}`, font].find((k) => PDF_FONTS[k]);
  const { widths, missingWidth } = PDF_FONTS[key];

  let units = 0;
  for (const char of text) {
    const code = char.codePointAt(0);
    units += (code >= 32 && code <= 255 && widths[code - 32]) || missingWidth;
  }
  return (units * size) / 1000 / 0.75;
}

/** Splits `text` at spaces into lines no wider than `maxWidth` px (a long word keeps its own line). */
export function wrapText(text, style, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measureText(candidate, style) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}
