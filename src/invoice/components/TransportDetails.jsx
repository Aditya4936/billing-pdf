import { TRANSPORT as L } from '../layout.js';
import { HLine, Text } from '../primitives.jsx';

const ROWS = [
  { label: 'Transporter', key: 'name' },
  { label: 'LR.No.', key: 'lrNo' },
  { label: 'Vehicle No.', key: 'vehicleNo' },
];

/** Transporter, LR number and vehicle number (left half, above the table). */
export default function TransportDetails({ transport }) {
  return (
    <g className="transport-details">
      <HLine {...L.top} />
      {ROWS.map(({ label, key }, i) => {
        const offsetY = i * L.rowHeight;
        return (
          <g key={key}>
            <Text {...L.label} offsetY={offsetY}>{label}</Text>
            <Text {...L.colon} offsetY={offsetY}>:</Text>
            <Text {...L.value} offsetY={offsetY}>{transport[key]}</Text>
          </g>
        );
      })}
    </g>
  );
}
