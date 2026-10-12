import { Schema } from 'mongoose';

/**
 * Field shapes shared by users, customers and invoices. They mirror the form draft in
 * src/data/invoice.js. Mongoose drops any key not listed here, so clients cannot store
 * arbitrary data.
 */
const text = (maxlength = 200) => ({ type: String, trim: true, default: '', maxlength });

export const companySchema = new Schema(
  {
    name: text(),
    addressLines: { type: [text(300)], default: ['', ''] },
    email: text(),
    mobile: text(),
    pan: text(20),
    gstin: text(20),
    udyam: text(30),
  },
  { _id: false },
);

export const bankSchema = new Schema(
  { name: text(), accountNo: text(40), ifsc: text(20) },
  { _id: false },
);

export const partySchema = new Schema(
  {
    name: text(),
    addressLines: { type: [text(300)], default: ['', ''] },
    city: text(),
    pincode: text(12),
    placeOfSupply: text(),
    pan: text(20),
    gstin: text(20),
  },
  { _id: false },
);

export const transporterSchema = new Schema(
  { name: text(), lrNo: text(), vehicleNo: text(30) },
  { _id: false },
);

// Quantities, rates and tax rates are strings in the form (they are typed into inputs).
const formNumber = { type: String, trim: true, default: '', maxlength: 24 };

export const draftItemSchema = new Schema(
  { name: text(), hsn: text(30), size: text(), grade: text(), qty: formNumber, rate: formNumber },
  { _id: false },
);

export const draftTaxSchema = new Schema({ label: text(60), rate: formNumber }, { _id: false });

/** The complete form state, kept so an invoice can be reopened or its PDF made again. */
export const draftSchema = new Schema(
  {
    memoType: text(30),
    title: text(60),
    copy: text(30),
    invoiceNo: text(40),
    date: text(10),
    company: { type: companySchema, default: () => ({}) },
    buyer: { type: partySchema, default: () => ({}) },
    shipToSameAsBuyer: { type: Boolean, default: true },
    shipTo: { type: partySchema, default: () => ({}) },
    transporter: { type: transporterSchema, default: () => ({}) },
    items: { type: [draftItemSchema], default: [] },
    taxes: { type: [draftTaxSchema], default: [] },
    bank: { type: bankSchema, default: () => ({}) },
    note: text(300),
    terms: { type: [text(300)], default: [] },
    jurisdiction: text(300),
  },
  { _id: false },
);

/** Seller details that are reused on every invoice. No items, prices or quantities. */
export const profileSchema = new Schema(
  {
    company: { type: companySchema, default: () => ({}) },
    bank: { type: bankSchema, default: () => ({}) },
    terms: { type: [text(300)], default: [] },
    jurisdiction: text(300),
    updatedAt: { type: Date },
  },
  { _id: false },
);
