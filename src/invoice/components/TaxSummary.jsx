import { TAX_SUMMARY as L } from '../layout.js';
import { HLine, Text, VLine } from '../primitives.jsx';
import { formatAmount, formatPercent } from '../../utils/format.js';

/** Taxable amount and one row per tax (Central Tax, State/UT Tax, ...). */
export default function TaxSummary({ taxableAmount, taxes }) {
  return (
    <g className="tax-summary">
      <HLine {...L.top} />
      <VLine {...L.divider} />
      <Text {...L.taxableLabel}>Taxable Amount</Text>
      <Text {...L.taxable}>{formatAmount(taxableAmount)}</Text>
      {taxes.map((tax, i) => {
        const offsetY = i * L.rowHeight;
        return (
          <g key={tax.label}>
            <Text {...L.taxLabel} offsetY={offsetY}>{tax.label}</Text>
            <Text {...L.taxRate} offsetY={offsetY}>{formatPercent(tax.rate)}</Text>
            <Text {...L.taxAmount} offsetY={offsetY}>{formatAmount(tax.amount)}</Text>
          </g>
        );
      })}
    </g>
  );
}
