import express, { Router } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { InvoicePdf } from '../models/InvoicePdf.js';
import { HttpError } from '../middleware/errors.js';
import { invoiceFilter } from '../lib/filters.js';
import { addPdf, invoiceSummary, pdfDetails, saveInvoice, suggestInvoiceNo } from '../lib/invoiceService.js';
import { toCsv } from '../lib/csv.js';
import { formatDisplayDate } from '../../src/utils/date.js';

const EXPORT_LIMIT = 5000;

// Invoice dates are stored at UTC midnight; formatDisplayDate reads local time, so rebuild the day locally.
const displayDay = (date) =>
  formatDisplayDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

function invoiceId(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(404, 'Invoice not found.');
  return req.params.id;
}

// The PDF arrives as the raw request body. 1 MB is far above a one-page invoice (about 15 KB).
const readPdf = express.raw({ type: 'application/pdf', limit: '1mb' });
const looksLikePdf = (body) => Buffer.isBuffer(body) && body.length > 0 && body.subarray(0, 5).toString() === '%PDF-';

export function invoicesRouter({ sessions }) {
  const router = Router();
  router.use(sessions.requireAuth);

  // History: ?q= (invoice no. / buyer / GSTIN) ?status= ?from= ?to= ?page= ?limit=
  router.get('/', async (req, res) => {
    const filter = invoiceFilter(req.user.id, req.query);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
    const requestedPage = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);

    const total = await Invoice.countDocuments(filter);
    const pages = Math.max(Math.ceil(total / limit), 1);
    const page = Math.min(requestedPage, pages);

    const invoices = await Invoice.find(filter)
      .select('-draft -items -taxes')
      .sort({ invoiceDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ invoices: invoices.map(invoiceSummary), total, page, pages, limit });
  });

  // The same filters as a spreadsheet, e.g. for the accountant. Declared before /:id.
  router.get('/export.csv', async (req, res) => {
    const invoices = await Invoice.find(invoiceFilter(req.user.id, req.query))
      .select('-draft -items -taxes')
      .sort({ invoiceDate: 1, createdAt: 1 })
      .limit(EXPORT_LIMIT);

    const rows = [
      ['Invoice No', 'Date', 'Memo', 'Buyer', 'Buyer GSTIN', 'Taxable Amount', 'GST', 'Total', 'Status', 'PDFs'],
      ...invoices.map((invoice) => {
        const s = invoiceSummary(invoice);
        return [
          s.invoiceNo,
          displayDay(s.invoiceDate),
          s.memoType,
          s.buyerName,
          s.buyerGstin,
          s.totals.taxableAmount,
          s.totals.totalTax,
          s.totals.grandTotal,
          s.status,
          s.pdfCount,
        ];
      }),
    ];

    res
      .type('text/csv; charset=utf-8')
      .set('Content-Disposition', 'attachment; filename="invoices.csv"')
      .send(toCsv(rows));
  });

  // The number to offer for a new invoice: the latest one plus one (null before the first).
  router.get('/next-number', async (req, res) => {
    res.json({ invoiceNo: await suggestInvoiceNo(req.user.id) });
  });

  // Save to history. Creates the invoice, or updates it when the number already exists.
  // Body: { draft, event?: 'save' | 'print' }. 'print' counts as a PDF made (no file is kept).
  router.post('/', async (req, res) => {
    const event = req.body?.event === 'print' ? 'print' : 'save';
    const { invoice, created } = await saveInvoice(req.user.id, req.body?.draft, event);
    res.status(created ? 201 : 200).json({ invoice: invoiceSummary(invoice), created });
  });

  // One invoice with its full draft, to open it in the editor or make its PDF again.
  router.get('/:id', async (req, res) => {
    const invoice = await Invoice.findOne({ _id: invoiceId(req), user: req.user.id }).select('-items -taxes');
    if (!invoice) throw new HttpError(404, 'Invoice not found.');
    res.json({ invoice: { ...invoiceSummary(invoice), draft: invoice.draft.toObject() } });
  });

  // Mark paid / unpaid. Body: { status }.
  router.patch('/:id/status', async (req, res) => {
    const status = req.body?.status;
    if (!['paid', 'unpaid'].includes(status)) throw new HttpError(400, 'Status must be paid or unpaid.');
    const invoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId(req), user: req.user.id },
      status === 'paid' ? { $set: { status, paidAt: new Date() } } : { $set: { status }, $unset: { paidAt: 1 } },
      { returnDocument: 'after' },
    ).select('-draft -items -taxes');
    if (!invoice) throw new HttpError(404, 'Invoice not found.');
    res.json({ invoice: invoiceSummary(invoice) });
  });

  // Stores the PDF file that was just made for this invoice. The body is the file itself
  // (Content-Type: application/pdf). Keeps the latest few; older ones are removed.
  router.post('/:id/pdfs', readPdf, async (req, res) => {
    const id = invoiceId(req);
    if (!looksLikePdf(req.body)) throw new HttpError(400, 'Send the PDF file as application/pdf.');
    const stored = await addPdf(req.user.id, id, req.body);
    if (!stored) throw new HttpError(404, 'Invoice not found.');
    res.status(201).json(stored);
  });

  // The stored PDF files of an invoice, newest first (details only).
  router.get('/:id/pdfs', async (req, res) => {
    const id = invoiceId(req);
    if (!(await Invoice.exists({ _id: id, user: req.user.id }))) throw new HttpError(404, 'Invoice not found.');
    const pdfs = await InvoicePdf.find({ invoice: id, user: req.user.id }).sort({ createdAt: -1, _id: -1 });
    res.json({ pdfs: pdfs.map(pdfDetails) });
  });

  // One stored PDF file, as a download.
  router.get('/:id/pdfs/:pdfId', async (req, res) => {
    const id = invoiceId(req);
    if (!mongoose.isValidObjectId(req.params.pdfId)) throw new HttpError(404, 'PDF not found.');
    const pdf = await InvoicePdf.findOne({ _id: req.params.pdfId, invoice: id, user: req.user.id }).select('+data');
    if (!pdf) throw new HttpError(404, 'PDF not found.');
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdf.fileName}"`,
        'Cache-Control': 'private, no-store',
      })
      .send(Buffer.from(pdf.data));
  });

  router.delete('/:id', async (req, res) => {
    const id = invoiceId(req);
    const { deletedCount } = await Invoice.deleteOne({ _id: id, user: req.user.id });
    if (!deletedCount) throw new HttpError(404, 'Invoice not found.');
    await InvoicePdf.deleteMany({ invoice: id, user: req.user.id });
    res.json({ ok: true });
  });

  return router;
}
