import { toPrintableInvoice, nextInvoiceNo } from '../../src/data/invoiceModel.js';
import { calculateInvoiceTotals } from '../../src/utils/totals.js';
import { round2 } from '../../src/utils/format.js';
import { HttpError } from '../middleware/errors.js';
import { fileNameFor } from '../../src/pdf/fileName.js';
import { Invoice } from '../models/Invoice.js';
import { InvoicePdf } from '../models/InvoicePdf.js';
import { Customer, customerKey } from '../models/Customer.js';
import { User } from '../models/User.js';
import { sellerDetailsOf } from './seller.js';

const MAX_AMOUNT = 1e12;

/** "25/09/2026" -> Date at UTC midnight, or null when it is not a real calendar date. */
export function parseDisplayDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return real ? date : null;
}

/**
 * Checks a form draft and derives everything stored with it. Totals come from the same
 * functions the invoice page and the PDF use, so history always matches the PDF; amounts
 * sent by the client are ignored.
 */
export async function prepareInvoice(draftInput) {
  if (!draftInput || typeof draftInput !== 'object' || Array.isArray(draftInput)) {
    throw new HttpError(400, 'Send the invoice details to save.');
  }

  // The schema keeps only known fields, trimmed and length-limited.
  const checked = new Invoice({ draft: draftInput });
  try {
    await checked.validate(['draft']);
  } catch {
    throw new HttpError(400, 'The invoice details are not valid.');
  }
  const draft = checked.draft.toObject();

  if (!draft.invoiceNo) throw new HttpError(400, 'Enter an invoice number before saving.');
  const invoiceDate = parseDisplayDate(draft.date);
  if (!invoiceDate) throw new HttpError(400, 'Enter a valid invoice date before saving.');

  const printable = toPrintableInvoice(draft);
  if (!printable.buyer.name) throw new HttpError(400, "Enter the buyer's name before saving.");
  if (printable.items.length === 0) throw new HttpError(400, 'Add at least one item before saving.');

  const totals = calculateInvoiceTotals(printable);
  const all = [totals.totalQty, totals.taxableAmount, totals.totalTax, totals.grandTotal];
  if (!all.every((n) => Number.isFinite(n) && Math.abs(n) < MAX_AMOUNT)) {
    throw new HttpError(400, 'An amount on this invoice is too large.');
  }

  return {
    invoiceNo: draft.invoiceNo,
    invoiceDate,
    memoType: draft.memoType,
    buyerName: printable.buyer.name,
    buyerGstin: printable.buyer.gstin,
    items: totals.items.map(({ name, hsn, qty, rate, amount }) => ({ name, hsn, qty, rate, amount })),
    taxes: totals.taxes.map(({ label, rate, amount }) => ({ label, rate, amount })),
    totals: {
      totalQty: totals.totalQty,
      taxableAmount: totals.taxableAmount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
    },
    draft,
    buyer: printable.buyer,
  };
}

/**
 * Saves an invoice to history. The invoice number is the identity: saving a number that
 * already exists updates that invoice (keeping its paid/unpaid status and PDF history).
 *
 * @param {'save'|'print'|undefined} event 'print' also counts as a PDF made (the browser's
 *   print dialog gives us no file). A downloaded PDF is stored through addPdf instead.
 * @returns {{ invoice, created: boolean }}
 */
export async function saveInvoice(userId, draftInput, event) {
  const { buyer, ...fields } = await prepareInvoice(draftInput);
  const madePdf = event === 'print';

  let result;
  // A double click can make two requests create the same new invoice at once; the unique
  // index rejects the second, which then simply updates the first.
  for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
    let invoice = await Invoice.findOne({ user: userId, invoiceNo: fields.invoiceNo });
    const created = !invoice;
    if (created) {
      invoice = new Invoice({
        user: userId,
        // A cash memo is paid on the spot; a debit memo is billed for later.
        status: fields.memoType === 'Cash Memo' ? 'paid' : 'unpaid',
        paidAt: fields.memoType === 'Cash Memo' ? new Date() : undefined,
      });
    }
    invoice.set(fields);
    // Saving the same content again must not make an existing PDF look out of date.
    if (invoice.isNew || invoice.isModified('draft')) invoice.contentUpdatedAt = new Date();
    if (madePdf) {
      invoice.pdfCount += 1;
      invoice.lastPdfAt = new Date();
    }
    try {
      await invoice.save();
      result = { invoice, created };
    } catch (error) {
      if (error.code !== 11000 || attempt === 1) throw error;
    }
  }

  // The invoice is saved; remembering the people and details on it must never fail the save.
  try {
    await Promise.all([rememberCustomer(userId, buyer), seedProfile(userId, draftInput)]);
  } catch (error) {
    console.error('Saved the invoice but could not update customer / seller details:', error);
  }
  return result;
}

/** How many PDF files are kept per invoice; storing another removes the oldest. */
export const MAX_PDFS_PER_INVOICE = 10;

/**
 * Stores a PDF file made for an invoice and counts it. Returns the stored file's details and
 * the updated invoice, or null when the invoice is not this user's.
 */
export async function addPdf(userId, invoiceId, bytes) {
  const invoice = await Invoice.findOne({ _id: invoiceId, user: userId }).select('invoiceNo');
  if (!invoice) return null;

  const pdf = await InvoicePdf.create({
    user: userId,
    invoice: invoice._id,
    fileName: `${fileNameFor(invoice.invoiceNo)}.pdf`,
    size: bytes.length,
    data: bytes,
  });

  const stale = await InvoicePdf.find({ invoice: invoice._id })
    .sort({ createdAt: -1, _id: -1 })
    .skip(MAX_PDFS_PER_INVOICE)
    .select('_id');
  if (stale.length) await InvoicePdf.deleteMany({ _id: { $in: stale.map((entry) => entry._id) } });

  const updated = await Invoice.findByIdAndUpdate(
    invoice._id,
    {
      $inc: { pdfCount: 1 },
      $set: { lastPdfAt: pdf.createdAt, latestPdfId: pdf._id, latestPdfAt: pdf.createdAt },
    },
    { returnDocument: 'after' },
  ).select('-draft -items -taxes');

  return { pdf: pdfDetails(pdf), invoice: invoiceSummary(updated) };
}

/** A stored PDF as the API shows it (never the file data). */
export const pdfDetails = (pdf) => ({
  id: String(pdf._id),
  fileName: pdf.fileName,
  size: pdf.size,
  createdAt: pdf.createdAt,
});

/** Keeps the buyer's main details so the buyer can be picked again on the next invoice. */
async function rememberCustomer(userId, buyer) {
  await Customer.updateOne(
    { user: userId, key: customerKey(buyer) },
    { $set: { details: buyer, lastUsedAt: new Date() } },
    { upsert: true },
  );
}

/** First save for an account: keeps the seller details on the invoice as the account's profile. */
async function seedProfile(userId, draftInput) {
  await User.updateOne(
    { _id: userId, profile: { $exists: false } },
    { $set: { profile: { ...sellerDetailsOf(draftInput), updatedAt: new Date() } } },
  );
}

/** The number to offer for a new invoice: the most recently created one, plus one. */
export async function suggestInvoiceNo(userId) {
  const latest = await Invoice.findOne({ user: userId }).sort({ createdAt: -1 }).select('invoiceNo').lean();
  return latest ? nextInvoiceNo(latest.invoiceNo) : null;
}

/** What the lists and the dashboard show about an invoice (no draft). */
export function invoiceSummary(invoice) {
  const doc = typeof invoice.toObject === 'function' ? invoice.toObject() : invoice;
  return {
    id: String(doc._id),
    invoiceNo: doc.invoiceNo,
    invoiceDate: doc.invoiceDate,
    memoType: doc.memoType,
    buyerName: doc.buyerName,
    buyerGstin: doc.buyerGstin,
    totals: {
      taxableAmount: round2(doc.totals?.taxableAmount ?? 0),
      totalTax: round2(doc.totals?.totalTax ?? 0),
      grandTotal: round2(doc.totals?.grandTotal ?? 0),
    },
    status: doc.status,
    paidAt: doc.paidAt ?? null,
    pdfCount: doc.pdfCount ?? 0,
    lastPdfAt: doc.lastPdfAt ?? null,
    // The newest stored PDF file, if any. `upToDate`: the invoice has not changed since it was made.
    pdf: doc.latestPdfId
      ? {
          id: String(doc.latestPdfId),
          createdAt: doc.latestPdfAt,
          upToDate: !doc.contentUpdatedAt || !doc.latestPdfAt || doc.contentUpdatedAt <= doc.latestPdfAt,
        }
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
