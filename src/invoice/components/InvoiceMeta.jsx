import { INVOICE_META as L } from '../layout.js';
import { Panel, Text } from '../primitives.jsx';

/** Shaded Invoice No. / Date panel (right half, above the table). */
export default function InvoiceMeta({ invoiceNo, date }) {
  const rows = [
    { label: 'Invoice No.', value: invoiceNo },
    { label: 'Date', value: date },
  ];

  return (
    <g className="invoice-meta">
      <Panel {...L.panel} />
      {rows.map(({ label, value }, i) => {
        const offsetY = i * L.rowHeight;
        return (
          <g key={label}>
            <Text {...L.label} offsetY={offsetY}>{label}</Text>
            <Text {...L.colon} offsetY={offsetY}>:</Text>
            <Text {...L.value} offsetY={offsetY}>{value}</Text>
          </g>
        );
      })}
    </g>
  );
}
