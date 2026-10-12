import { Router } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { HttpError } from '../middleware/errors.js';
import { invoiceFilter } from '../lib/filters.js';
import { invoiceSummary, saveInvoice, suggestInvoiceNo } from '../lib/invoiceService.js';
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
  // Body: { draft, event?: 'save' | 'pdf' | 'print' }. 'pdf' / 'print' count as a PDF made.
  router.post('/', async (req, res) => {
    const event = ['save', 'pdf', 'print'].includes(req.body?.event) ? req.body.event : 'save';
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

  // Records that a PDF of an existing invoice was downloaded again.
  router.post('/:id/pdf', async (req, res) => {
    const invoice = await Invoice.findOneAndUpdate(
      { _id: invoiceId(req), user: req.user.id },
      { $inc: { pdfCount: 1 }, $set: { lastPdfAt: new Date() } },
      { returnDocument: 'after' },
    ).select('-draft -items -taxes');
    if (!invoice) throw new HttpError(404, 'Invoice not found.');
    res.json({ invoice: invoiceSummary(invoice) });
  });

  router.delete('/:id', async (req, res) => {
    const { deletedCount } = await Invoice.deleteOne({ _id: invoiceId(req), user: req.user.id });
    if (!deletedCount) throw new HttpError(404, 'Invoice not found.');
    res.json({ ok: true });
  });

  return router;
}
