import { AMOUNT_SUMMARY as L } from '../layout.js';
import { wrapText } from '../measure.js';
import { HLine, Panel, Text } from '../primitives.jsx';
import { amountInWords } from '../../utils/amountInWords.js';
import { formatIndianAmount } from '../../utils/format.js';

/** An amount in words, wrapped onto further lines if it would reach the tax summary. */
function Words({ slot, amount }) {
  const lines = wrapText(amountInWords(amount), slot, L.wordsRight - slot.x);
  return lines.map((line, i) => (
    <Text key={i} {...slot} offsetY={i * L.wordsLineHeight}>
      {line}
    </Text>
  ));
}

/** Total GST and bill amount in words, plus the shaded Grand Total panel. */
export default function AmountSummary({ totalTax, grandTotal }) {
  return (
    <g className="amount-summary">
      <Text {...L.totalTaxLabel}>Total GST :</Text>
      <Words slot={L.totalTaxWords} amount={totalTax} />
      <Text {...L.billAmountLabel}>Bill Amount :</Text>
      <Words slot={L.billAmountWords} amount={grandTotal} />

      <Panel {...L.grandTotalPanel} />
      <HLine {...L.grandTotalRule} />
      <Text {...L.grandTotalLabel}>Grand Total</Text>
      <Text {...L.grandTotal}>{formatIndianAmount(grandTotal)}</Text>
    </g>
  );
}
