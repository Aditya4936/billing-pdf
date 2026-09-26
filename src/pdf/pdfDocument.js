/**
 * Minimal single-page PDF serializer: catalog, page, one content stream, non-embedded
 * TrueType fonts (WinAnsiEncoding) and an info dictionary. Enough for the invoice.
 */

const encoder = new TextEncoder();

// "%PDF-1.4" followed by a comment of high bytes, which marks the file as binary.
const HEADER = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
]);

// Same encoding as the reference PDF: WinAnsi, with NBSP drawn as a space and SHY as a hyphen.
const FONT_ENCODING =
  '<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [127 /.notdef 160 /space 173 /hyphen 176 /degree] >>';

/** A number for PDF operators: at most 3 decimals, never in exponent form. */
export function num(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

/** A PDF text string: a literal for printable ASCII, UTF-16BE hex otherwise. */
function textString(value) {
  if (/^[\x20-\x7e]*$/.test(value)) return `(${value.replace(/[\\()]/g, '\\$&')})`;
  let hex = 'FEFF';
  for (let i = 0; i < value.length; i += 1) {
    hex += value.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}

/** PDF date string with the local time-zone offset, e.g. D:20260926143000+05'30'. */
function pdfDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return (
    `D:${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}'${pad(abs % 60)}'`
  );
}

async function deflate(bytes) {
  if (typeof CompressionStream !== 'function') return null;
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function fontDictionary(metrics, descriptorId) {
  return (
    `<< /Type /Font /Subtype /TrueType /BaseFont /${metrics.baseFont} /FirstChar 32 /LastChar 255 ` +
    `/Widths [${metrics.widths.join(' ')}] /FontDescriptor ${descriptorId} 0 R /Encoding ${FONT_ENCODING} >>`
  );
}

function fontDescriptor(metrics) {
  return (
    `<< /Type /FontDescriptor /FontName /${metrics.baseFont} /Flags ${metrics.flags} ` +
    `/FontBBox [${metrics.fontBBox.join(' ')}] /ItalicAngle 0 /Ascent ${metrics.ascent} ` +
    `/Descent ${metrics.descent} /CapHeight ${metrics.capHeight} /XHeight ${metrics.xHeight} ` +
    `/StemV 0 /MissingWidth ${metrics.missingWidth} >>`
  );
}

function serialize(objects, rootId, infoId) {
  const chunks = [];
  let length = 0;
  const push = (part) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  push(HEADER);
  const offsets = objects.map((body, index) => {
    const offset = length;
    const id = index + 1;
    if (typeof body === 'string') {
      push(`${id} 0 obj\n${body}\nendobj\n`);
    } else {
      push(`${id} 0 obj\n<< ${body.dict} >>\nstream\n`);
      push(body.data);
      push('\nendstream\nendobj\n');
    }
    return offset;
  });

  const xrefOffset = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets) push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  push(
    `trailer\n<< /Size ${objects.length + 1} /Root ${rootId} 0 R /Info ${infoId} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`,
  );

  const output = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  return output;
}

/**
 * Builds a one-page PDF.
 * @param {object} page
 * @param {number} page.width  page width in pt
 * @param {number} page.height page height in pt
 * @param {string} page.content content-stream operators (ASCII)
 * @param {{name: string, metrics: object}[]} page.fonts font resources used by `content`
 * @param {string} [page.title]
 * @returns {Promise<Uint8Array>}
 */
export async function writePdf({ width, height, content, fonts, title = '' }) {
  const objects = [];
  const reserve = () => objects.push(null); // returns the new object's number
  const set = (id, body) => {
    objects[id - 1] = body;
  };

  const catalogId = reserve();
  const pagesId = reserve();
  const pageId = reserve();
  const contentId = reserve();

  const fontResources = fonts.map(({ name, metrics }) => {
    const fontId = reserve();
    const descriptorId = reserve();
    set(fontId, fontDictionary(metrics, descriptorId));
    set(descriptorId, fontDescriptor(metrics));
    return `/${name} ${fontId} 0 R`;
  });

  const infoId = reserve();

  set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  set(pagesId, `<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  set(
    pageId,
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${num(width)} ${num(height)}] ` +
      `/Resources << /ProcSet [/PDF /Text] /Font << ${fontResources.join(' ')} >> >> ` +
      `/Contents ${contentId} 0 R >>`,
  );

  const raw = encoder.encode(content);
  const compressed = await deflate(raw);
  set(
    contentId,
    compressed
      ? { dict: `/Length ${compressed.length} /Filter /FlateDecode`, data: compressed }
      : { dict: `/Length ${raw.length}`, data: raw },
  );

  set(
    infoId,
    `<< /Title ${textString(title)} /Producer (billing-pdf) /CreationDate ${textString(pdfDate())} >>`,
  );

  return serialize(objects, catalogId, infoId);
}
