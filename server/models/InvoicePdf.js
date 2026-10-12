import mongoose, { Schema } from 'mongoose';

/**
 * One PDF file that was downloaded for an invoice, stored byte for byte. Kept in its own
 * collection so listing invoices never loads file data. A 26-row invoice is about 15 KB.
 */
const invoicePdfSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoice: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    fileName: { type: String, required: true },
    size: { type: Number, required: true },
    // Not loaded unless asked for with .select('+data').
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

invoicePdfSchema.index({ invoice: 1, createdAt: -1 });
invoicePdfSchema.index({ user: 1 });

export const InvoicePdf = mongoose.model('InvoicePdf', invoicePdfSchema);
