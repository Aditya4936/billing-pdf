import { BANK as L } from '../layout.js';
import { HLine, Text } from '../primitives.jsx';

/** Bank name, account number and IFSC. */
export default function BankDetails({ bank }) {
  const rows = [
    { label: 'Bank Name', value: bank.name },
    { label: 'Bank A/c. No.', value: bank.accountNo },
    { label: 'RTGS/IFSC Code', value: bank.ifsc },
  ];

  return (
    <g className="bank-details">
      <HLine {...L.top} />
      <HLine {...L.bottom} />
      {rows.map(({ label, value }, i) => (
        <g key={label}>
          <Text {...L.rows[i].label}>{label}</Text>
          <Text {...L.rows[i].colon}>:</Text>
          <Text {...L.rows[i].value}>{value}</Text>
        </g>
      ))}
    </g>
  );
}
