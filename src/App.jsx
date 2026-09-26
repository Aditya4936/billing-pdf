import './App.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import Invoice from './invoice/Invoice.jsx';
import InvoiceForm from './form/InvoiceForm.jsx';
import { invoice as sampleInvoice } from './data/invoice.js';
import { createNextInvoice, toPrintableInvoice } from './data/invoiceModel.js';
import { loadDraft, saveDraft } from './data/draftStorage.js';
import { calculateInvoiceTotals } from './utils/totals.js';
import { createInvoicePdf } from './pdf/invoicePdf.js';
import { downloadFile } from './pdf/download.js';

/** "UI/404/26-27" -> "SalesBill_UI_404_26-27", the original file's naming. */
const fileNameFor = (invoiceNo) => `SalesBill_${(invoiceNo || 'Invoice').replace(/[^A-Za-z0-9-]+/g, '_')}`;

export default function App() {
  const [draft, setDraft] = useState(() => loadDraft(sampleInvoice));
  const [isExporting, setIsExporting] = useState(false);
  const pageRef = useRef(null);

  const invoice = useMemo(() => toPrintableInvoice(draft), [draft]);
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);
  const fileName = fileNameFor(invoice.invoiceNo);

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  // Browsers also offer the document title as the file name in Print > Save as PDF.
  useEffect(() => {
    document.title = fileName;
  }, [fileName]);

  async function downloadPdf() {
    setIsExporting(true);
    try {
      const pdf = await createInvoicePdf(pageRef.current, { title: fileName });
      downloadFile(pdf, `${fileName}.pdf`, 'application/pdf');
    } catch (error) {
      console.error(error);
      window.alert('Sorry, the PDF could not be created.');
    } finally {
      setIsExporting(false);
    }
  }

  function startNewInvoice() {
    if (window.confirm('Start a new invoice? The buyer, transport, item and note details will be cleared.')) {
      setDraft(createNextInvoice);
    }
  }

  return (
    <div className="app">
      <header className="app-bar screen-only">
        <h1>Sales Bill</h1>
        <div className="app-actions">
          <button type="button" className="button" onClick={startNewInvoice}>
            New Invoice
          </button>
          <button type="button" className="button" onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className="button primary" onClick={downloadPdf} disabled={isExporting}>
            Download PDF
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="form-pane screen-only" aria-label="Invoice details">
          <InvoiceForm draft={draft} totals={totals} onChange={setDraft} />
        </section>
        <section className="preview-pane" aria-label="Invoice preview">
          <Invoice ref={pageRef} invoice={invoice} />
        </section>
      </main>
    </div>
  );
}
