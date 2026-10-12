/**
 * One CSV cell. Quotes values that need it, and defuses text a spreadsheet would run as a
 * formula (a buyer named "=HYPERLINK(...)") by prefixing an apostrophe.
 */
function cell(value) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

// U+FEFF: tells Excel the file is UTF-8, so Gujarati / Hindi names are not garbled.
const BOM = String.fromCharCode(0xfeff);

/** Rows (arrays) to CSV text. Starts with a BOM so Excel reads names in any script correctly. */
export function toCsv(rows) {
  return `${BOM}${rows.map((row) => row.map(cell).join(',')).join('\r\n')}\r\n`;
}
