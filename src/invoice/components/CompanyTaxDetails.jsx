import { COMPANY_TAX as L } from '../layout.js';
import { Text } from '../primitives.jsx';

/** Seller's PAN / GSTIN / UDYAM, printed in the left part of the totals row. */
export default function CompanyTaxDetails({ company }) {
  return (
    <g className="company-tax-details">
      <Text {...L.panLabel}>PAN No.:</Text>
      <Text {...L.pan}>{company.pan}</Text>
      <Text {...L.gstinLabel}>GSTIN No.:</Text>
      <Text {...L.gstin}>{company.gstin}</Text>
      <Text {...L.udyamLabel}>UDYAM No.:</Text>
      <Text {...L.udyam}>{company.udyam}</Text>
    </g>
  );
}
