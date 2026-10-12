import mongoose, { Schema } from 'mongoose';
import { draftSchema } from './schemas.js';

const amount = { type: Number, default: 0 };

const invoiceSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Searchable / reportable copies of values that also live inside `draft`.
    invoiceNo: { type: String, required: true, trim: true, maxlength: 40 },
    invoiceDate: { type: Date, required: true },
    memoType: { type: String, default: '' },
    buyerName: { type: String, default: '' },
    buyerGstin: { type: String, default: '' },

    // Calculated on the server from the draft (same code as the PDF), never taken from the client.
    items: {
      type: [
        new Schema(
          { name: String, hsn: String, qty: amount, rate: amount, amount },
          { _id: false },
        ),
      ],
      default: [],
    },
    taxes: {
      type: [new Schema({ label: String, rate: amount, amount }, { _id: false })],
      default: [],
    },
    totals: {
      totalQty: amount,
      taxableAmount: amount,
      totalTax: amount,
      grandTotal: amount,
    },

    status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
    paidAt: Date,

    // PDF history: how many times a PDF was downloaded or printed, and when last.
    pdfCount: { type: Number, default: 0 },
    lastPdfAt: Date,
    // The newest stored PDF file (see InvoicePdf), and when the invoice's content last changed.
    // The PDF is "up to date" when the content has not changed since it was made.
    latestPdfId: { type: Schema.Types.ObjectId, ref: 'InvoicePdf' },
    latestPdfAt: Date,
    contentUpdatedAt: Date,

    draft: { type: draftSchema, required: true },
  },
  { timestamps: true },
);

// An invoice number is unique per user; saving the same number again updates that invoice.
invoiceSchema.index({ user: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ user: 1, invoiceDate: -1 });
invoiceSchema.index({ user: 1, createdAt: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
