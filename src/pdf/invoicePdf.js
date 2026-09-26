import { PDF_FONTS } from './fontMetrics.js';
import { num, writePdf } from './pdfDocument.js';

const PT_PER_PX = 0.75;

// WinAnsiEncoding differs from Latin-1 only in 0x80-0x9F.
const WIN_ANSI_EXTRAS = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86],
  [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95],
  [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

/** Text as WinAnsi codes; characters the encoding lacks become "?". */
function toWinAnsi(text) {
  return Array.from(text, (char) => {
    const cp = char.codePointAt(0);
    if (cp < 0x20) return 0x20;
    if (cp <= 0x7e || (cp >= 0xa0 && cp <= 0xff)) return cp;
    return WIN_ANSI_EXTRAS.get(cp) ?? 0x3f;
  });
}

function pdfString(codes) {
  let out = '(';
  for (const code of codes) {
    if (code === 0x28 || code === 0x29 || code === 0x5c) out += `\\${String.fromCharCode(code)}`;
    else if (code > 0x7e) out += `\\${code.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(code);
  }
  return `${out})`;
}

/** "rgb(234, 234, 234)" -> "0.918 0.918 0.918"; null for none/transparent. */
function pdfColor(cssColor) {
  const match = /rgba?\(([^)]+)\)/.exec(cssColor);
  if (!match) return null;
  const [r, g, b, alpha = 1] = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (alpha === 0) return null;
  return [r, g, b].map((channel) => num(channel / 255)).join(' ');
}

/** Maps computed font styles to one of the PDF fonts (e.g. "verdana-bold"). */
function fontKey(style) {
  const family = style.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '').toLowerCase();
  const base = family.startsWith('verdana') ? 'verdana' : family.startsWith('tahoma') ? 'tahoma' : 'times';
  const bold = Number(style.fontWeight) >= 600 ? '-bold' : '';
  const italic = style.fontStyle === 'normal' ? '' : '-italic';
  return [`${base}${bold}${italic}`, `${base}${bold}`, base].find((key) => PDF_FONTS[key]);
}

function textWidth(codes, metrics, size) {
  const units = codes.reduce((sum, code) => sum + (metrics.widths[code - 32] || metrics.missingWidth), 0);
  return (units * size) / 1000;
}

/**
 * Transcribes the invoice SVG into a vector PDF the way the reference PDF is built:
 * each <line>, <rect> and <text> becomes the matching PDF operator, in paint order,
 * at the same coordinates (px x 0.75, y axis flipped), on a 594.75 x 841.5 pt page.
 *
 * Text uses the reference's non-embedded TrueType fonts with their exact widths, so
 * centred and right-aligned text lands where the original software placed it.
 * Assumes untransformed line/rect/text elements only (see invoice/primitives.jsx).
 *
 * @param {SVGSVGElement} svg the rendered invoice page
 * @returns {Promise<Uint8Array>} PDF file bytes
 */
export async function createInvoicePdf(svg, { title = '' } = {}) {
  const { width, height } = svg.viewBox.baseVal;
  const pageWidth = width * PT_PER_PX;
  const pageHeight = height * PT_PER_PX;
  const x = (px) => px * PT_PER_PX;
  const y = (px) => pageHeight - px * PT_PER_PX;

  const fontNames = new Map();
  const ops = [];

  for (const el of svg.querySelectorAll('line, rect, text')) {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const attr = (name) => Number.parseFloat(el.getAttribute(name)) || 0;

    if (el.tagName === 'text') {
      const key = fontKey(style);
      if (!fontNames.has(key)) fontNames.set(key, `F${fontNames.size + 1}`);
      const metrics = PDF_FONTS[key];
      const size = Math.round(Number.parseFloat(style.fontSize) * PT_PER_PX * 100) / 100;
      const codes = toWinAnsi(el.textContent);
      const textW = textWidth(codes, metrics, size);
      const shift = style.textAnchor === 'middle' ? textW / 2 : style.textAnchor === 'end' ? textW : 0;
      const color = pdfColor(style.fill) ?? '0 0 0';
      ops.push(
        `BT /${fontNames.get(key)} ${num(size)} Tf ${color} rg ` +
          `${num(x(attr('x')) - shift)} ${num(y(attr('y')))} Td ${pdfString(codes)} Tj ET`,
      );
      continue;
    }

    const fill = pdfColor(style.fill);
    const stroke = pdfColor(style.stroke);
    if (!fill && !stroke) continue;
    const paint = [];
    if (fill) paint.push(`${fill} rg`);
    if (stroke) paint.push(`${stroke} RG ${num(Number.parseFloat(style.strokeWidth) * PT_PER_PX)} w`);

    if (el.tagName === 'line') {
      if (!stroke) continue;
      ops.push(
        `${paint.join(' ')} ${num(x(attr('x1')))} ${num(y(attr('y1')))} m ` +
          `${num(x(attr('x2')))} ${num(y(attr('y2')))} l S`,
      );
    } else {
      const operator = fill && stroke ? 'B' : fill ? 'f' : 'S';
      ops.push(
        `${paint.join(' ')} ${num(x(attr('x')))} ${num(y(attr('y') + attr('height')))} ` +
          `${num(x(attr('width')))} ${num(attr('height') * PT_PER_PX)} re ${operator}`,
      );
    }
  }

  return writePdf({
    width: pageWidth,
    height: pageHeight,
    content: ops.join('\n'),
    fonts: [...fontNames].map(([key, name]) => ({ name, metrics: PDF_FONTS[key] })),
    title,
  });
}
