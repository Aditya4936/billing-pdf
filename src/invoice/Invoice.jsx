import './Invoice.css';
import { PAGE } from './layout.js';
import { calculateInvoiceTotals } from '../utils/totals.js';
import InvoiceFrame from './components/InvoiceFrame.jsx';
import ProductTable from './components/ProductTable.jsx';
import CompanyDetails from './components/CompanyDetails.jsx';
import InvoiceHeader from './components/InvoiceHeader.jsx';
import PartyDetails from './components/PartyDetails.jsx';
import TransportDetails from './components/TransportDetails.jsx';
import InvoiceMeta from './components/InvoiceMeta.jsx';
import CompanyTaxDetails from './components/CompanyTaxDetails.jsx';
import BankDetails from './components/BankDetails.jsx';
import TaxSummary from './components/TaxSummary.jsx';
import AmountSummary from './components/AmountSummary.jsx';
import InvoiceNote from './components/InvoiceNote.jsx';
import TermsAndConditions from './components/TermsAndConditions.jsx';
import SignatureSection from './components/SignatureSection.jsx';

/**
 * One invoice page: a fixed 793 x 1122 px SVG (the reference's 594.75 x 841.5 pt page).
 *
 * SVG paints in document order, so the section order below is also the paint order.
 * It follows the reference PDF wherever a grey panel meets a rule:
 *  - InvoiceMeta's panel comes after InvoiceFrame and ProductTable, so it covers
 *    the right border and the table's top rule where it overlaps them by 1px, and
 *    before PartyDetails and TransportDetails, whose rules are drawn over its edges;
 *  - AmountSummary's Grand Total panel comes before TaxSummary and InvoiceNote,
 *    whose rules are drawn over it (the doubled rule under "Grand Total").
 *
 * `ref` receives the <svg> element; the PDF export (pdf/invoicePdf.js) reads it.
 */
export default function Invoice({ invoice, ref }) {
  const totals = calculateInvoiceTotals(invoice);
  const { company, buyer, shipTo, transporter, bank } = invoice;

  return (
    <svg
      ref={ref}
      className="invoice-page"
      width={PAGE.width}
      height={PAGE.height}
      viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
      aria-label={`${invoice.title} ${invoice.invoiceNo}`}
    >
      <InvoiceFrame />
      <ProductTable items={totals.items} totalQty={totals.totalQty} totalAmount={totals.taxableAmount} />
      <CompanyDetails company={company} />
      <InvoiceHeader memoType={invoice.memoType} title={invoice.title} copy={invoice.copy} />
      <InvoiceMeta invoiceNo={invoice.invoiceNo} date={invoice.date} />
      <PartyDetails buyer={buyer} shipTo={shipTo} />
      <TransportDetails transport={transporter} />
      <CompanyTaxDetails company={company} />
      <BankDetails bank={bank} />
      <AmountSummary totalTax={totals.totalTax} grandTotal={totals.grandTotal} />
      <TaxSummary taxableAmount={totals.taxableAmount} taxes={totals.taxes} />
      <InvoiceNote note={invoice.note} />
      <TermsAndConditions terms={invoice.terms} jurisdiction={invoice.jurisdiction} />
      <SignatureSection companyName={company.name} />
    </svg>
  );
}
