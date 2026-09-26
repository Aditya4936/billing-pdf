import { PARTIES } from '../layout.js';
import PartyColumn from './PartyColumn.jsx';

// The reference pads the ship-to city to a 25-character field before "-pincode".
const CITY_FIELD_WIDTH = 25;

/** "Ship To Party" column. */
export default function ShippingDetails({ shipTo }) {
  const cityLine = `${shipTo.city.padEnd(CITY_FIELD_WIDTH)}-${shipTo.pincode}`;

  return (
    <g className="shipping-details">
      <PartyColumn layout={PARTIES.shipTo} party={shipTo} cityLine={cityLine} />
    </g>
  );
}
