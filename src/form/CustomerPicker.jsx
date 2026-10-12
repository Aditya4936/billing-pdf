import { useId } from 'react';

/** Fills the buyer from one the account has billed before. Renders nothing until there is one. */
export default function CustomerPicker({ customers, onPick }) {
  const id = useId();
  if (customers.length === 0) return null;

  return (
    <div className="customer-picker">
      <label htmlFor={id}>Saved buyers</label>
      {/* Always shows the prompt: picking a buyer fills the fields, it is not a form value. */}
      <select
        id={id}
        value=""
        onChange={(event) => {
          const customer = customers.find((entry) => entry.id === event.target.value);
          if (customer) onPick(customer.details);
        }}
      >
        <option value="">Choose a buyer…</option>
        {customers.map(({ id: customerId, details }) => (
          <option key={customerId} value={customerId}>
            {details.name}
            {details.city ? ` — ${details.city}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
