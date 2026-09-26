import { TextField } from './fields.jsx';

/**
 * Buyer / ship-to fields. `field(path)` returns the change handler for a path inside
 * the party, e.g. field(['addressLines', 0]).
 */
export default function PartyFields({ party, field }) {
  return (
    <>
      <TextField label="Name (M/s.)" value={party.name} onChange={field(['name'])} maxLength={30} />
      <TextField
        label="Address line 1"
        value={party.addressLines[0]}
        onChange={field(['addressLines', 0])}
        maxLength={60}
      />
      <TextField
        label="Address line 2"
        value={party.addressLines[1]}
        onChange={field(['addressLines', 1])}
        maxLength={60}
      />
      <TextField span={2} label="City" value={party.city} onChange={field(['city'])} maxLength={25} uppercase />
      <TextField
        span={2}
        label="Pincode"
        value={party.pincode}
        onChange={field(['pincode'])}
        maxLength={6}
        inputMode="numeric"
      />
      <TextField
        span={2}
        label="Place of Supply"
        value={party.placeOfSupply}
        onChange={field(['placeOfSupply'])}
        maxLength={30}
        placeholder="24-Gujarat"
      />
      <TextField span={3} label="PAN No." value={party.pan} onChange={field(['pan'])} maxLength={10} uppercase />
      <TextField span={3} label="GSTIN No." value={party.gstin} onChange={field(['gstin'])} maxLength={15} uppercase />
    </>
  );
}
