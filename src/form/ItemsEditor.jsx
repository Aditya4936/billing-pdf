import { formatAmount } from '../utils/format.js';

const COLUMNS = [
  { key: 'name', label: 'Product Name', maxLength: 28 },
  { key: 'hsn', label: 'HSN/SAC', maxLength: 10 },
  { key: 'size', label: 'Size', maxLength: 16 },
  { key: 'grade', label: 'Grade', maxLength: 10 },
  { key: 'qty', label: 'Qty', numeric: true },
  { key: 'rate', label: 'Rate', numeric: true },
];

function lineAmount(item) {
  if (item.qty === '' || item.rate === '') return '';
  return formatAmount((Number(item.qty) || 0) * (Number(item.rate) || 0));
}

/** Product rows: one line per item, with add / remove. */
export default function ItemsEditor({ items, maxItems, onFieldChange, onAdd, onRemove }) {
  return (
    <div className="items-editor">
      <div className="items-row items-head" aria-hidden="true">
        <span className="num">#</span>
        {COLUMNS.map((column) => (
          <span key={column.key} className={column.numeric ? 'num' : undefined}>
            {column.label}
          </span>
        ))}
        <span className="num">Amount</span>
        <span />
      </div>

      {items.map((item, index) => (
        <div className="items-row" key={index}>
          <span className="items-index num">{index + 1}</span>
          {COLUMNS.map((column) => (
            <input
              key={column.key}
              aria-label={`Item ${index + 1} ${column.label}`}
              value={item[column.key] ?? ''}
              onChange={(event) => onFieldChange(index, column.key, event.target.value)}
              {...(column.numeric
                ? { type: 'number', inputMode: 'decimal', min: '0', step: 'any', className: 'num' }
                : { type: 'text', maxLength: column.maxLength })}
            />
          ))}
          <span className="items-amount num">{lineAmount(item)}</span>
          <button
            type="button"
            className="remove-button"
            aria-label={`Remove item ${index + 1}`}
            title="Remove item"
            onClick={() => onRemove(index)}
          >
            ×
          </button>
        </div>
      ))}

      <div className="items-foot">
        <button type="button" className="button" onClick={onAdd} disabled={items.length >= maxItems}>
          Add Item
        </button>
        <span className="hint">
          {items.length} of {maxItems} rows
        </span>
      </div>
    </div>
  );
}
