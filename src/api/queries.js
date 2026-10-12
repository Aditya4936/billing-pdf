import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { api } from './api.js';

/**
 * What the app reads from the server, and under which name it is remembered. Reading goes
 * through these; changing data goes through `api` and then calls `refreshInvoiceData` below.
 *
 * Deliberately not here: the next invoice number (it must always be asked fresh, or two
 * invoices could be offered the same number) and a single invoice's full details (only read
 * at the moment it is opened).
 */

export const profileQuery = () => queryOptions({ queryKey: ['profile'], queryFn: () => api.profile.get() });

export const customersQuery = () => queryOptions({ queryKey: ['customers'], queryFn: () => api.customers.list() });

/** One page of the history. Keeps showing the previous page while the next one loads. */
export const invoiceListQuery = (params) =>
  queryOptions({
    queryKey: ['invoices', 'list', params],
    queryFn: () => api.invoices.list(params),
    placeholderData: keepPreviousData,
  });

/** The stored PDF files of one invoice. `newestId` changes when a newer file is made. */
export const invoicePdfsQuery = (invoiceId, newestId) =>
  queryOptions({
    queryKey: ['invoices', 'pdfs', invoiceId, newestId],
    queryFn: () => api.invoices.pdfs(invoiceId),
  });

/** The dashboard numbers for a period. Keeps showing the previous period while the next loads. */
export const statsQuery = (params) =>
  queryOptions({
    queryKey: ['stats', params],
    queryFn: () => api.stats.get(params),
    placeholderData: keepPreviousData,
  });

/**
 * Call after an invoice was saved, changed or deleted: the history, the PDF lists and the
 * dashboard are all worked out from invoices. Pages that are open refresh now; the rest are
 * refreshed the next time they are opened. Resolves once the open pages have the new data.
 */
export const refreshInvoiceData = (queryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    queryClient.invalidateQueries({ queryKey: ['stats'] }),
  ]);

/** Saving an invoice also remembers its buyer, so the saved-buyer list is out of date too. */
export const refreshAfterSave = (queryClient) =>
  Promise.all([refreshInvoiceData(queryClient), queryClient.invalidateQueries({ queryKey: ['customers'] })]);
