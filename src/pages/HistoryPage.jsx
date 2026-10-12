import './HistoryPage.css';
import { useId, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/api.js';
import { invoiceListQuery, invoicePdfsQuery, refreshInvoiceData } from '../api/queries.js';
import { useAuth } from '../auth/AuthContext.js';
import { hasUnsavedWork, markSaved, saveDraft } from '../data/draftStorage.js';
import { toPrintableInvoice } from '../data/invoiceModel.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { downloadFile } from '../pdf/download.js';
import { fileNameFor } from '../pdf/fileName.js';
import { renderInvoicePdf } from '../pdf/renderInvoicePdf.jsx';
import { formatDateTime, formatDisplayDate, serverDateToDisplay } from '../utils/date.js';
import { formatRupees } from '../utils/format.js';

const PAGE_SIZE = 20;
const NO_FILTERS = { q: '', status: '', from: '', to: '' };

const formatSize = (bytes) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * How many PDFs were made for an invoice and when last. When files are kept, it expands to
 * list them (newest first) with a download link each.
 */
function PdfVersions({ row }) {
  const [open, setOpen] = useState(false);
  // Only asked once opened, and remembered: opening it again does not ask again. A newer PDF
  // (a different newest id) is a different list, so it is asked for again.
  const { data, error } = useQuery({ ...invoicePdfsQuery(row.id, row.pdf?.id), enabled: open });
  const pdfs = data?.pdfs;

  if (row.pdfCount === 0) return 'None yet';
  const summary = `${row.pdfCount} · ${formatDisplayDate(new Date(row.lastPdfAt))}`;
  if (!row.pdf) return summary; // Printed only: there is no file to list.

  return (
    <div className="pdf-versions">
      <button type="button" className="link-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {summary}
      </button>
      {open && (
        <ul>
          {error && <li>Could not load the files. {error.message}</li>}
          {!pdfs && !error && <li>Loading…</li>}
          {pdfs?.map((pdf) => (
            <li key={pdf.id}>
              <span>
                {formatDateTime(pdf.createdAt)} · {formatSize(pdf.size)}
              </span>
              <a href={api.invoices.pdfUrl(row.id, pdf.id)} download>
                Download
              </a>
            </li>
          ))}
          {pdfs?.length >= 10 && <li>The latest 10 files are kept.</li>}
        </ul>
      )}
    </div>
  );
}

/** Every invoice saved or downloaded: search, filter, reopen, duplicate, download again. */
export default function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ids ={ q: useId(), status: useId(), from: useId(), to: useId() };

  const [filters, setFilters] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null);

  const q = useDebouncedValue(filters.q);
  const params = useMemo(
    () => ({ q, status: filters.status, from: filters.from, to: filters.to }),
    [q, filters.status, filters.from, filters.to],
  );

  // Each combination of filters and page is remembered, so coming back to the page (or to a
  // search already made) shows the list at once. While a new one loads, the previous stays
  // on screen, dimmed.
  const list = useQuery(invoiceListQuery({ ...params, page, limit: PAGE_SIZE }));
  const { data } = list;
  const listError = list.error?.message ?? '';
  const isLoading = list.isPending || list.isPlaceholderData;
  const filtersActive = Object.values(filters).some(Boolean);
  const currentPage = data?.page ?? page;

  function changeFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }

  const clearFilters = () => {
    setFilters(NO_FILTERS);
    setPage(1);
  };
  // Resolves when the list on screen is up to date, so the row stays disabled until then.
  const reload = () => refreshInvoiceData(queryClient);

  /** Runs a row action, disabling that row meanwhile and reporting a failure in plain words. */
  async function onRow(row, failure, task) {
    setBusyId(row.id);
    setNotice(null);
    try {
      await task();
    } catch (error) {
      setNotice({ kind: 'error', text: `${failure} ${error.message}` });
    } finally {
      setBusyId(null);
    }
  }

  const canReplaceEditor = () =>
    !hasUnsavedWork(user.id) ||
    window.confirm('The invoice in the editor has not been saved. Replace it with this one?');

  const openInvoice = (row) =>
    onRow(row, 'Could not open the invoice.', async () => {
      if (!canReplaceEditor()) return;
      const { invoice } = await api.invoices.get(row.id);
      saveDraft(user.id, invoice.draft);
      markSaved(user.id, invoice.draft);
      navigate('/');
    });

  // A copy for the next order: same buyer and items, a new number and today's date.
  const duplicateInvoice = (row) =>
    onRow(row, 'Could not duplicate the invoice.', async () => {
      if (!canReplaceEditor()) return;
      const [{ invoice }, { invoiceNo }] = await Promise.all([api.invoices.get(row.id), api.invoices.nextNumber()]);
      saveDraft(user.id, {
        ...invoice.draft,
        invoiceNo: invoiceNo ?? invoice.draft.invoiceNo,
        date: formatDisplayDate(new Date()),
      });
      navigate('/');
    });

  // For an invoice without a current stored PDF (never downloaded, or edited since): make a
  // new one from the invoice as it is now, download it and keep it as the newest version.
  const makePdf = (row) =>
    onRow(row, 'Could not make the PDF.', async () => {
      const { invoice } = await api.invoices.get(row.id);
      const name = fileNameFor(invoice.invoiceNo);
      const pdf = await renderInvoicePdf(toPrintableInvoice(invoice.draft), { title: name });
      downloadFile(pdf, `${name}.pdf`, 'application/pdf');
      try {
        await api.invoices.uploadPdf(row.id, pdf);
      } catch (error) {
        setNotice({ kind: 'error', text: `The PDF was downloaded, but a copy could not be kept. ${error.message}` });
      }
      await reload();
    });

  const toggleStatus = (row) =>
    onRow(row, 'Could not change the status.', async () => {
      await api.invoices.setStatus(row.id, row.status === 'paid' ? 'unpaid' : 'paid');
      await reload();
    });

  const removeInvoice = (row) => {
    if (!window.confirm(`Delete invoice ${row.invoiceNo} for ${row.buyerName}? This cannot be undone.`)) return;
    onRow(row, 'Could not delete the invoice.', async () => {
      await api.invoices.remove(row.id);
      await reload();
    });
  };

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-head">
          <h1>Invoice history</h1>
          <a className="button" href={api.invoices.csvUrl(params)} download>
            Export CSV
          </a>
        </div>

        <form className="filters" onSubmit={(event) => event.preventDefault()} role="search">
          <div className="filter-field grow">
            <label htmlFor={ids.q}>Search</label>
            <input
              id={ids.q}
              type="search"
              placeholder="Invoice no., buyer or GSTIN"
              value={filters.q}
              onChange={(event) => changeFilter('q', event.target.value)}
            />
          </div>
          <div className="filter-field">
            <label htmlFor={ids.status}>Status</label>
            <select id={ids.status} value={filters.status} onChange={(event) => changeFilter('status', event.target.value)}>
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor={ids.from}>From</label>
            <input id={ids.from} type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => changeFilter('from', event.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor={ids.to}>To</label>
            <input id={ids.to} type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => changeFilter('to', event.target.value)} />
          </div>
          {filtersActive && (
            <button type="button" className="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </form>

        {(notice || listError) && (
          <p className="notice error" role="alert">
            {notice?.text ?? `Could not load the invoices. ${listError}`}
          </p>
        )}

        {!data && isLoading && <p className="page-message">Loading invoices…</p>}

        {data && data.total === 0 && (
          <div className="empty">
            {filtersActive ? (
              <>
                <h2>No invoices match these filters</h2>
                <p>Try a different search, or show every invoice.</p>
                <button type="button" className="button primary" onClick={clearFilters}>
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <h2>No invoices yet</h2>
                <p>Invoices you save, print or download are kept here.</p>
                <Link className="button primary" to="/">
                  Create an invoice
                </Link>
              </>
            )}
          </div>
        )}

        {data && data.total > 0 && (
          <>
            <div className={`table-wrap${isLoading ? ' is-stale' : ''}`} aria-busy={isLoading}>
              <table className="history-table">
                <caption className="sr-only">Saved invoices, newest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Invoice no.</th>
                    <th scope="col">Date</th>
                    <th scope="col">Buyer</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                    <th scope="col">Status</th>
                    <th scope="col">PDFs</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <tr key={row.id}>
                        <td className="strong">{row.invoiceNo}</td>
                        <td>{serverDateToDisplay(row.invoiceDate)}</td>
                        <td>
                          {row.buyerName}
                          {row.memoType === 'Cash Memo' && <span className="muted"> · Cash memo</span>}
                        </td>
                        <td className="num">{formatRupees(row.totals.grandTotal)}</td>
                        <td>
                          <span className={`badge ${row.status}`}>{row.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                        </td>
                        <td className="muted">
                          <PdfVersions row={row} />
                        </td>
                        <td>
                          <div className="row-actions">
                            <button type="button" className="button small" disabled={busy} onClick={() => openInvoice(row)}>
                              Open
                            </button>
                            {row.pdf?.upToDate ? (
                              <a
                                className="button small"
                                href={api.invoices.pdfUrl(row.id, row.pdf.id)}
                                download
                                title={`Download the PDF made on ${formatDateTime(row.pdf.createdAt)}`}
                              >
                                PDF
                              </a>
                            ) : (
                              <button
                                type="button"
                                className="button small"
                                disabled={busy}
                                onClick={() => makePdf(row)}
                                title={row.pdf ? 'The invoice changed after its last PDF. Make a new one.' : 'Make the PDF'}
                              >
                                PDF
                              </button>
                            )}
                            <button type="button" className="button small" disabled={busy} onClick={() => toggleStatus(row)}>
                              {row.status === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                            </button>
                            <button type="button" className="button small" disabled={busy} onClick={() => duplicateInvoice(row)}>
                              Duplicate
                            </button>
                            <button type="button" className="button small danger" disabled={busy} onClick={() => removeInvoice(row)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <span>
                {data.total} {data.total === 1 ? 'invoice' : 'invoices'}
                {data.pages > 1 && ` · page ${currentPage} of ${data.pages}`}
              </span>
              {data.pages > 1 && (
                <div className="pager-buttons">
                  <button type="button" className="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    Previous
                  </button>
                  <button type="button" className="button" disabled={currentPage >= data.pages} onClick={() => setPage(currentPage + 1)}>
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
