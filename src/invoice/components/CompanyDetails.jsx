import { COMPANY as L } from '../layout.js';
import { Panel, Text } from '../primitives.jsx';

/** Letterhead: shaded name band, address lines, e-mail and mobile. */
export default function CompanyDetails({ company }) {
  return (
    <g className="company-details">
      <Panel {...L.band} />
      <Text {...L.name}>{company.name}</Text>
      {company.addressLines.map((line, i) => (
        <Text key={i} {...L.address} offsetY={i * L.addressLineHeight}>
          {line}
        </Text>
      ))}
      <Text {...L.emailLabel}>E-mail :</Text>
      <Text {...L.email}>{company.email}</Text>
      <Text {...L.mobileLabel}>Mo :</Text>
      <Text {...L.mobile}>{company.mobile}</Text>
    </g>
  );
}
