import { PARTIES as L } from '../layout.js';
import { Panel, Text, VLine } from '../primitives.jsx';
import BuyerDetails from './BuyerDetails.jsx';
import ShippingDetails from './ShippingDetails.jsx';

/** Shaded "Buyer To Party | Ship To Party" band and the two party columns below it. */
export default function PartyDetails({ buyer, shipTo }) {
  return (
    <g className="party-details">
      <Panel {...L.band} />
      {/* The divider is drawn over the band, so it stays visible through it. */}
      <VLine {...L.divider} />
      <Text {...L.buyerHeading}>Buyer To Party</Text>
      <Text {...L.shipToHeading}>Ship To Party</Text>
      <BuyerDetails buyer={buyer} />
      <ShippingDetails shipTo={shipTo} />
    </g>
  );
}
