import mongoose, { Schema } from 'mongoose';
import { partySchema } from './schemas.js';

/**
 * A buyer saved from an invoice so it can be picked again. Main details only: name,
 * address, tax ids. Nothing from the items table.
 */
const customerSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // One customer per GSTIN, or per name when there is no GSTIN.
    key: { type: String, required: true },
    details: { type: partySchema, required: true },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

customerSchema.index({ user: 1, key: 1 }, { unique: true });
customerSchema.index({ user: 1, lastUsedAt: -1 });

/** Identity of a buyer: GSTIN when present, otherwise the lower-cased name. */
export function customerKey(party) {
  const gstin = (party.gstin ?? '').trim().toUpperCase();
  return gstin || `name:${(party.name ?? '').trim().toLowerCase()}`;
}

export const Customer = mongoose.model('Customer', customerSchema);
