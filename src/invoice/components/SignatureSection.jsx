import { SIGNATURE as L } from '../layout.js';
import { Text } from '../primitives.jsx';

/** "For, <company>" and the authorised signatory caption. */
export default function SignatureSection({ companyName }) {
  return (
    <g className="signature-section">
      <Text {...L.forCompany}>{`For, ${companyName}`}</Text>
      <Text {...L.signatory}>(Authorised Signatory)</Text>
    </g>
  );
}
