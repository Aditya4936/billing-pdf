import './InvoiceForm.css';
import { PRODUCT_TABLE } from '../invoice/layout.js';
import { TAX_TYPES, emptyItem, isBlankParty, taxTypeOf, taxesForType } from '../data/invoiceModel.js';
import { formatAmount, formatIndianAmount } from '../utils/format.js';
import { setIn } from '../utils/setIn.js';
import {
  CheckboxField,
  CollapsibleSection,
  DateField,
  FormSection,
  NumberField,
  SelectField,
  TextField,
} from './fields.jsx';
import ItemsEditor from './ItemsEditor.jsx';
import PartyFields from './PartyFields.jsx';

const MEMO_TYPES = ['Debit Memo', 'Cash Memo'];
const COPY_LABELS = ['Original', 'Duplicate', 'Triplicate'];
const TAX_TYPE_OPTIONS = Object.entries(TAX_TYPES).map(([value, { label }]) => ({ value, label }));
// Three numbered terms plus the jurisdiction clause fill the terms area of the page.
const TERM_SLOTS = 3;

/** The billing form. `onChange` receives state updaters for the draft. */
export default function InvoiceForm({ draft, totals, onChange }) {
  // Change handler for the value at `path` in the draft.
  const field = (path) => (value) => onChange((current) => setIn(current, path, value));
  const fieldIn = (base) => (path) => field([...base, ...path]);

  const setSameAsBuyer = (same) =>
    onChange((current) => ({
      ...current,
      shipToSameAsBuyer: same,
      // When shipping is separated from an empty ship-to, start from the buyer's details.
      shipTo: !same && isBlankParty(current.shipTo) ? structuredClone(current.buyer) : current.shipTo,
    }));

  const setItemField = (index, key, value) => onChange((current) => setIn(current, ['items', index, key], value));
  const addItem = () => onChange((current) => ({ ...current, items: [...current.items, emptyItem()] }));
  const removeItem = (index) =>
    onChange((current) => ({
      ...current,
      items: current.items.length === 1 ? [emptyItem()] : current.items.filter((_, i) => i !== index),
    }));

  const setTaxType = (type) => onChange((current) => ({ ...current, taxes: taxesForType(type, current.taxes) }));
  const terms = Array.from({ length: TERM_SLOTS }, (_, i) => draft.terms[i] ?? '');

  return (
    <form className="invoice-form" onSubmit={(event) => event.preventDefault()}>
      <FormSection title="Invoice">
        <TextField span={2} label="Invoice No." value={draft.invoiceNo} onChange={field(['invoiceNo'])} maxLength={20} />
        <DateField span={2} label="Date" value={draft.date} onChange={field(['date'])} />
        <SelectField span={1} label="Memo" value={draft.memoType} options={MEMO_TYPES} onChange={field(['memoType'])} />
        <SelectField span={1} label="Copy" value={draft.copy} options={COPY_LABELS} onChange={field(['copy'])} />
      </FormSection>

      <FormSection title="Buyer (Bill To)">
        <PartyFields party={draft.buyer} field={fieldIn(['buyer'])} />
      </FormSection>

      <FormSection
        title="Ship To"
        aside={<CheckboxField label="Same as buyer" checked={draft.shipToSameAsBuyer} onChange={setSameAsBuyer} />}
      >
        {draft.shipToSameAsBuyer ? (
          <p className="hint span-6">Goods are shipped to the buyer&apos;s address.</p>
        ) : (
          <PartyFields party={draft.shipTo} field={fieldIn(['shipTo'])} />
        )}
      </FormSection>

      <FormSection title="Transport">
        <TextField
          span={2}
          label="Transporter"
          value={draft.transporter.name}
          onChange={field(['transporter', 'name'])}
          maxLength={30}
        />
        <TextField
          span={2}
          label="LR No."
          value={draft.transporter.lrNo}
          onChange={field(['transporter', 'lrNo'])}
          maxLength={30}
        />
        <TextField
          span={2}
          label="Vehicle No."
          value={draft.transporter.vehicleNo}
          onChange={field(['transporter', 'vehicleNo'])}
          maxLength={20}
          uppercase
        />
      </FormSection>

      <FormSection title="Items" grid={false}>
        <ItemsEditor
          items={draft.items}
          maxItems={PRODUCT_TABLE.maxRows}
          onFieldChange={setItemField}
          onAdd={addItem}
          onRemove={removeItem}
        />
        <dl className="totals-line">
          <div>
            <dt>Taxable Amount</dt>
            <dd>{formatAmount(totals.taxableAmount)}</dd>
          </div>
          <div>
            <dt>GST</dt>
            <dd>{formatAmount(totals.totalTax)}</dd>
          </div>
          <div>
            <dt>Grand Total</dt>
            <dd>{formatIndianAmount(totals.grandTotal)}</dd>
          </div>
        </dl>
      </FormSection>

      <FormSection title="Tax (GST)">
        <SelectField
          span={2}
          label="Tax Type"
          value={taxTypeOf(draft.taxes)}
          options={TAX_TYPE_OPTIONS}
          onChange={setTaxType}
        />
        {draft.taxes.map((tax, index) => (
          <NumberField
            key={tax.label}
            span={2}
            label={`${tax.label} (%)`}
            value={tax.rate}
            onChange={field(['taxes', index, 'rate'])}
          />
        ))}
      </FormSection>

      <FormSection title="Note">
        <TextField label="Note (optional)" value={draft.note} onChange={field(['note'])} maxLength={90} />
      </FormSection>

      <CollapsibleSection title="Seller & Bank Details">
        <TextField label="Company Name" value={draft.company.name} onChange={field(['company', 'name'])} maxLength={40} />
        <TextField
          label="Address line 1"
          value={draft.company.addressLines[0]}
          onChange={field(['company', 'addressLines', 0])}
          maxLength={90}
        />
        <TextField
          label="Address line 2"
          value={draft.company.addressLines[1]}
          onChange={field(['company', 'addressLines', 1])}
          maxLength={90}
        />
        <TextField
          span={3}
          type="email"
          label="E-mail"
          value={draft.company.email}
          onChange={field(['company', 'email'])}
          maxLength={50}
        />
        <TextField
          span={3}
          type="tel"
          label="Mobile"
          value={draft.company.mobile}
          onChange={field(['company', 'mobile'])}
          maxLength={30}
        />
        <TextField
          span={2}
          label="PAN No."
          value={draft.company.pan}
          onChange={field(['company', 'pan'])}
          maxLength={10}
          uppercase
        />
        <TextField
          span={2}
          label="GSTIN No."
          value={draft.company.gstin}
          onChange={field(['company', 'gstin'])}
          maxLength={15}
          uppercase
        />
        <TextField
          span={2}
          label="UDYAM No."
          value={draft.company.udyam}
          onChange={field(['company', 'udyam'])}
          maxLength={19}
          uppercase
        />
        <TextField span={2} label="Bank Name" value={draft.bank.name} onChange={field(['bank', 'name'])} maxLength={40} />
        <TextField
          span={2}
          label="Bank A/c. No."
          value={draft.bank.accountNo}
          onChange={field(['bank', 'accountNo'])}
          maxLength={20}
        />
        <TextField
          span={2}
          label="RTGS/IFSC Code"
          value={draft.bank.ifsc}
          onChange={field(['bank', 'ifsc'])}
          maxLength={11}
          uppercase
        />
      </CollapsibleSection>

      <CollapsibleSection title="Terms & Conditions">
        {terms.map((term, index) => (
          <TextField
            key={index}
            label={`Term ${index + 1}`}
            value={term}
            onChange={field(['terms', index])}
            maxLength={110}
          />
        ))}
        <TextField
          label="Jurisdiction (printed as the last term)"
          value={draft.jurisdiction}
          onChange={field(['jurisdiction'])}
          maxLength={110}
        />
      </CollapsibleSection>
    </form>
  );
}
