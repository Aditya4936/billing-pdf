import { FRAME } from '../layout.js';
import { HLine, VLine } from '../primitives.jsx';

/** The outer border around the whole invoice. */
export default function InvoiceFrame() {
  const { left, right, top, bottom } = FRAME;

  return (
    <g className="invoice-frame">
      <VLine x={left} y1={top} y2={bottom} />
      <VLine x={right} y1={top} y2={bottom} />
      <HLine y={top} x1={left} x2={right} />
      <HLine y={bottom} x1={left} x2={right} />
    </g>
  );
}
