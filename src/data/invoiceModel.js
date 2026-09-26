import { formatDisplayDate } from '../utils/date.js';

/** Tax rows for each GST type. The rate is split evenly between the rows. */
export const TAX_TYPES = {
  'cgst-sgst': { label: 'CGST + SGST (same state)', rows: ['Central Tax', 'State/UT Tax'] },
  igst: { label: 'IGST (other state)', rows: ['Integrated Tax'] },
};

export const taxTypeOf = (taxes) => (taxes.length === 1 ? 'igst' : 'cgst-sgst');

/** Rebuilds the tax rows for `type`, keeping the total GST rate. */
export function taxesForType(type, taxes) {
  const total = taxes.reduce((sum, tax) => sum + (Number(tax.rate) || 0), 0);
  const labels = TAX_TYPES[type].rows;
  const rate = String(Math.round((total / labels.length) * 1000) / 1000);
  return labels.map((label) => ({ label, rate }));
}

export const emptyParty = () => ({
  name: '',
  addressLines: ['', ''],
  city: '',
  pincode: '',
  placeOfSupply: '',
  pan: '',
  gstin: '',
});

export const isBlankParty = (party) =>
  [party.name, party.city, party.pincode, party.placeOfSupply, party.pan, party.gstin, ...party.addressLines].every(
    (value) => !value || !String(value).trim(),
  );

export const emptyItem = () => ({ name: '', hsn: '', size: '', grade: '', qty: '', rate: '' });

const ITEM_FIELDS = Object.keys(emptyItem());
const isBlankItem = (item) => ITEM_FIELDS.every((key) => String(item[key] ?? '').trim() === '');

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/**
 * Turns the form draft into the invoice data the page renders: resolves "same as buyer",
 * drops blank item rows and empty terms, and converts quantities, rates and tax rates to numbers.
 */
export function toPrintableInvoice(draft) {
  return {
    ...draft,
    shipTo: draft.shipToSameAsBuyer ? draft.buyer : draft.shipTo,
    items: draft.items
      .filter((item) => !isBlankItem(item))
      .map((item) => ({ ...item, qty: toNumber(item.qty), rate: toNumber(item.rate) })),
    taxes: draft.taxes.map((tax) => ({ ...tax, rate: toNumber(tax.rate) })),
    terms: draft.terms.filter((term) => typeof term === 'string' && term.trim() !== ''),
  };
}

/** "UI/404/26-27" -> "UI/405/26-27": increments the last all-digit segment, keeping its width. */
export function nextInvoiceNo(invoiceNo) {
  const parts = invoiceNo.split('/');
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (/^\d+$/.test(parts[i])) {
      parts[i] = String(Number(parts[i]) + 1).padStart(parts[i].length, '0');
      return parts.join('/');
    }
  }
  return invoiceNo;
}

/**
 * The next invoice: keeps the seller, bank, tax and terms details; clears the buyer,
 * shipping, transport, items and note; bumps the invoice number and dates it today.
 */
export function createNextInvoice(draft) {
  return {
    ...draft,
    invoiceNo: nextInvoiceNo(draft.invoiceNo),
    date: formatDisplayDate(new Date()),
    buyer: emptyParty(),
    shipTo: emptyParty(),
    shipToSameAsBuyer: true,
    transporter: { name: '', lrNo: '', vehicleNo: '' },
    items: [emptyItem()],
    note: '',
  };
}
