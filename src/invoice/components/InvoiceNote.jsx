import { NOTE as L } from '../layout.js';
import { HLine, Text } from '../primitives.jsx';

/** "Note :" row. Its bottom rule is drawn over the Grand Total panel, as in the reference. */
export default function InvoiceNote({ note }) {
  return (
    <g className="invoice-note">
      <HLine {...L.top} />
      <HLine {...L.bottom} />
      <Text {...L.label}>Note :</Text>
      <Text {...L.text}>{note}</Text>
    </g>
  );
}
