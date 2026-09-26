import { FRAME, TITLE_STRIP as L } from '../layout.js';
import { HLine, Text } from '../primitives.jsx';

/** Title strip: "Debit Memo" | "TAX INVOICE" | "Original". */
export default function InvoiceHeader({ memoType, title, copy }) {
  return (
    <g className="invoice-header">
      <HLine y={L.top} x1={FRAME.left} x2={FRAME.right} />
      <HLine y={L.bottom} x1={FRAME.left} x2={FRAME.right} />
      <Text {...L.memoType}>{memoType}</Text>
      <Text {...L.title}>{title}</Text>
      <Text {...L.copy}>{copy}</Text>
    </g>
  );
}
