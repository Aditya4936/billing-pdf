import { PARTIES } from '../layout.js';
import PartyColumn from './PartyColumn.jsx';

/** "Buyer To Party" column. */
export default function BuyerDetails({ buyer }) {
  return (
    <g className="buyer-details">
      <PartyColumn layout={PARTIES.buyer} party={buyer} cityLine={`${buyer.city} - ${buyer.pincode}`} />
    </g>
  );
}
