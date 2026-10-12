import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import Invoice from '../invoice/Invoice.jsx';
import { createInvoicePdf } from './invoicePdf.js';

/**
 * Makes the PDF of an invoice that is not on screen (for example one picked from history).
 * The page is drawn off-screen first because the PDF is read from the rendered SVG, so it
 * is identical to the one downloaded from the editor.
 *
 * @param {object} invoice a printable invoice (see toPrintableInvoice)
 * @returns {Promise<Uint8Array>} PDF file bytes
 */
export async function renderInvoicePdf(invoice, { title = '' } = {}) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;';
  document.body.append(host);

  const root = createRoot(host);
  try {
    let svg = null;
    flushSync(() => {
      root.render(
        <Invoice
          invoice={invoice}
          ref={(element) => {
            svg = element;
          }}
        />,
      );
    });
    return await createInvoicePdf(svg, { title });
  } finally {
    root.unmount();
    host.remove();
  }
}
