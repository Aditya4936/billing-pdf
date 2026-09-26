import { AMOUNT_SUMMARY as L } from '../layout.js';
import { HLine, Panel, Text } from '../primitives.jsx';
import { amountInWords } from '../../utils/amountInWords.js';
import { formatIndianAmount } from '../../utils/format.js';

/** Total GST and bill amount in words, plus the shaded Grand Total panel. */
export default function AmountSummary({ totalTax, grandTotal }) {
  return (
    <g className="amount-summary">
      <Text {...L.totalTaxLabel}>Total GST :</Text>
      <Text {...L.totalTaxWords}>{amountInWords(totalTax)}</Text>
      <Text {...L.billAmountLabel}>Bill Amount :</Text>
      <Text {...L.billAmountWords}>{amountInWords(grandTotal)}</Text>

      <Panel {...L.grandTotalPanel} />
      <HLine {...L.grandTotalRule} />
      <Text {...L.grandTotalLabel}>Grand Total</Text>
      <Text {...L.grandTotal}>{formatIndianAmount(grandTotal)}</Text>
    </g>
  );
}
