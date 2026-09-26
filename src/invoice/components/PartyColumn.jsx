import { Text } from '../primitives.jsx';

/** One party block (buyer or ship-to). `layout` holds that column's slots. */
export default function PartyColumn({ layout: L, party, cityLine }) {
  return (
    <>
      <Text {...L.msLabel}>{'M/s.   :'}</Text>
      <Text {...L.name}>{party.name}</Text>
      {party.addressLines.map((line, i) => (
        <Text key={i} {...L.address} offsetY={i * L.addressLineHeight}>
          {line}
        </Text>
      ))}
      <Text {...L.cityLine}>{cityLine}</Text>
      <Text {...L.placeOfSupplyLabel}>Place of Supply :</Text>
      <Text {...L.placeOfSupply}>{party.placeOfSupply}</Text>
      <Text {...L.panLabel}>PAN No.</Text>
      <Text {...L.panColon}>:</Text>
      <Text {...L.pan}>{party.pan}</Text>
      <Text {...L.gstinLabel}>GSTIN No.</Text>
      <Text {...L.gstinColon}>:</Text>
      <Text {...L.gstin}>{party.gstin}</Text>
    </>
  );
}
