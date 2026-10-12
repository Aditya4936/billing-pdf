import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Invoice from '../invoice/Invoice.jsx';
import InvoiceForm from '../form/InvoiceForm.jsx';
import { api } from '../api/api.js';
import { customersQuery, profileQuery, refreshAfterSave, refreshInvoiceData } from '../api/queries.js';
import { useAuth } from '../auth/AuthContext.js';
import { invoice as sampleInvoice } from '../data/invoice.js';
import {
  createBlankInvoice,
  createNextInvoice,
  sellerDetailsOf,
  toPrintableInvoice,
} from '../data/invoiceModel.js';
import { hasUnsavedWork, loadDraft, markSaved, saveDraft } from '../data/draftStorage.js';
import { calculateInvoiceTotals } from '../utils/totals.js';
import { createInvoicePdf } from '../pdf/invoicePdf.js';
import { downloadFile } from '../pdf/download.js';
import { fileNameFor } from '../pdf/fileName.js';

// How long after the last edit the seller details are saved to the account.
const SELLER_SAVE_DELAY_MS = 1200;

// A stable empty list, so the form is not handed a "new" list on every render.
const NO_CUSTOMERS = [];

/**
 * The billing page. The invoice being edited is kept in this browser; a new browser (or a
 * fresh login) starts from the seller details saved on the account.
 */
export default function BillingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [initialDraft, setInitialDraft] = useState(() => loadDraft(user.id, sampleInvoice));

  useEffect(() => {
    if (initialDraft) return undefined;
    let active = true;
    // The saved seller details and the next invoice number. If the server cannot be reached,
    // start blank rather than not at all.
    Promise.allSettled([queryClient.fetchQuery(profileQuery()), api.invoices.nextNumber()]).then(([profile, number]) => {
      if (!active) return;
      const blank = createBlankInvoice(profile.status === 'fulfilled' ? profile.value.profile : null);
      const invoiceNo = number.status === 'fulfilled' ? number.value.invoiceNo : null;
      setInitialDraft(invoiceNo ? { ...blank, invoiceNo } : blank);
    });
    return () => {
      active = false;
    };
  }, [initialDraft, queryClient]);

  if (!initialDraft) return <p className="page-message">Loading your details…</p>;
  return <InvoiceEditor user={user} initialDraft={initialDraft} />;
}

function InvoiceEditor({ user, initialDraft }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initialDraft);
  // The saved-buyer list is a convenience; the form works without it, so a failure is ignored.
  const customers = useQuery(customersQuery()).data?.customers ?? NO_CUSTOMERS;
  const [notice, setNotice] = useState(null); // { kind: 'ok' | 'error' | 'busy', text }
  const [isBusy, setIsBusy] = useState(false);
  const pageRef = useRef(null);

  const invoice = useMemo(() => toPrintableInvoice(draft), [draft]);
  const totals = useMemo(() => calculateInvoiceTotals(invoice), [invoice]);
  const fileName = fileNameFor(invoice.invoiceNo);

  useEffect(() => {
    saveDraft(user.id, draft);
  }, [user.id, draft]);

  // Browsers also offer the document title as the file name in Print > Save as PDF.
  useEffect(() => {
    document.title = fileName;
  }, [fileName]);

  // Seller details are saved to the account shortly after they are edited, and again with
  // every Save / PDF / Print. Only edits made here are sent, so a browser that still holds
  // an older copy can never overwrite newer details saved from another device.
  const sellerJson = JSON.stringify(sellerDetailsOf(draft));
  const savedSellerJson = useRef(JSON.stringify(sellerDetailsOf(initialDraft)));

  const syncSeller = useCallback(async () => {
    if (sellerJson === savedSellerJson.current) return;
    const saved = await api.profile.save(JSON.parse(sellerJson));
    queryClient.setQueryData(profileQuery().queryKey, saved); // The server's reply is the new truth.
    savedSellerJson.current = sellerJson;
  }, [sellerJson, queryClient]);

  useEffect(() => {
    if (sellerJson === savedSellerJson.current) return undefined;
    const timer = setTimeout(() => syncSeller().catch(() => {}), SELLER_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [sellerJson, syncSeller]);

  /**
   * Saves the invoice (and the seller and buyer details on it) to history. With `pdf` (the
   * file that was just downloaded) the file is kept with the invoice too.
   */
  async function saveToHistory(event, pdf) {
    setNotice({ kind: 'busy', text: 'Saving…' });

    let saved;
    let created;
    try {
      ({ invoice: saved, created } = await api.invoices.save(draft, event));
    } catch (error) {
      setNotice({ kind: 'error', text: `Not saved to history. ${error.message}` });
      return false;
    }
    markSaved(user.id, draft);
    await syncSeller().catch(() => {});
    refreshAfterSave(queryClient); // History, dashboard and saved buyers now have something new.

    const done = created ? `Invoice ${saved.invoiceNo} saved to history` : `Invoice ${saved.invoiceNo} updated in history`;
    if (!pdf) {
      setNotice({ kind: 'ok', text: `${done}.` });
      return true;
    }
    try {
      await api.invoices.uploadPdf(saved.id, pdf);
      refreshInvoiceData(queryClient); // The history shows how many PDFs each invoice has.
      setNotice({ kind: 'ok', text: `${done}, with its PDF.` });
    } catch (error) {
      // The invoice is saved and the PDF is already on this computer; only the copy is missing.
      setNotice({ kind: 'error', text: `${done}, but a copy of the PDF could not be kept. ${error.message}` });
    }
    return true;
  }

  async function runBusy(task) {
    setIsBusy(true);
    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  }

  const save = () => runBusy(() => saveToHistory('save'));

  const downloadPdf = () =>
    runBusy(async () => {
      let pdf;
      try {
        pdf = await createInvoicePdf(pageRef.current, { title: fileName });
        downloadFile(pdf, `${fileName}.pdf`, 'application/pdf');
      } catch (error) {
        console.error(error);
        window.alert('Sorry, the PDF could not be created.');
        return;
      }
      await saveToHistory('save', pdf);
    });

  const print = () =>
    runBusy(async () => {
      await saveToHistory('print');
      window.print();
    });

  async function startNewInvoice() {
    if (
      hasUnsavedWork(user.id) &&
      !window.confirm(
        'This invoice has not been saved. Start a new one anyway? The buyer, transport, item and note details will be cleared.',
      )
    ) {
      return;
    }

    // Offer the number after the latest saved invoice, and the latest saved seller details.
    // Asked fresh (staleTime 0) because the person just chose to start over: details saved from
    // another device must not be missed. The reply also refreshes what is remembered.
    const [number, profile] = await Promise.allSettled([
      api.invoices.nextNumber(),
      queryClient.fetchQuery({ ...profileQuery(), staleTime: 0 }),
    ]);
    const suggestedNo = number.status === 'fulfilled' ? number.value.invoiceNo : null;
    const savedProfile = profile.status === 'fulfilled' ? profile.value.profile : null;
    // Seller edits still waiting to be saved win over what the server has.
    const sellerIsSynced = sellerJson === savedSellerJson.current;

    setDraft((current) => ({
      ...createNextInvoice(current),
      ...(suggestedNo && { invoiceNo: suggestedNo }),
      ...(savedProfile && sellerIsSynced && sellerDetailsOf(createBlankInvoice(savedProfile))),
    }));
    setNotice(null);
  }

  return (
    <div className="app">
      <header className="app-bar screen-only">
        <h1>Create invoice</h1>
        <p className={`app-status ${notice?.kind ?? ''}`} role="status">
          {notice?.text}
        </p>
        <div className="app-actions">
          <button type="button" className="button" onClick={startNewInvoice} disabled={isBusy}>
            New Invoice
          </button>
          <button type="button" className="button" onClick={save} disabled={isBusy}>
            Save
          </button>
          <button type="button" className="button" onClick={print} disabled={isBusy}>
            Print
          </button>
          <button type="button" className="button primary" onClick={downloadPdf} disabled={isBusy}>
            Download PDF
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="form-pane screen-only" aria-label="Invoice details">
          <InvoiceForm
            draft={draft}
            totals={totals}
            customers={customers}
            onChange={setDraft}
          />
        </section>
        <section className="preview-pane" aria-label="Invoice preview">
          <Invoice ref={pageRef} invoice={invoice} />
        </section>
      </main>
    </div>
  );
}
