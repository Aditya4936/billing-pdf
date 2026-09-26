import { round2 } from './format.js';

/**
 * Derives every computed figure on the invoice from its line items and tax rates:
 * line amounts, total quantity, taxable amount, each tax, total GST and grand total.
 */
export function calculateInvoiceTotals({ items, taxes }) {
  const lines = items.map((item) => ({
    ...item,
    amount: item.amount ?? round2(item.qty * item.rate),
  }));

  const totalQty = lines.reduce((sum, line) => sum + line.qty, 0);
  const taxableAmount = round2(lines.reduce((sum, line) => sum + line.amount, 0));
  const taxLines = taxes.map((tax) => ({
    ...tax,
    amount: round2((taxableAmount * tax.rate) / 100),
  }));
  const totalTax = round2(taxLines.reduce((sum, tax) => sum + tax.amount, 0));
  const grandTotal = round2(taxableAmount + totalTax);

  return { items: lines, totalQty, taxableAmount, taxes: taxLines, totalTax, grandTotal };
}
