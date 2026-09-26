import { FRAME, PRODUCT_TABLE as L } from '../layout.js';
import { HLine, Text, VLine } from '../primitives.jsx';
import { formatAmount, formatQuantity } from '../../utils/format.js';

const COLUMNS = [
  { key: 'srNo', title: 'SrNo' },
  { key: 'name', title: 'Product Name' },
  { key: 'hsn', title: 'HSN/SAC' },
  { key: 'size', title: 'Size' },
  { key: 'grade', title: 'Grade' },
  { key: 'qty', title: 'Qty', format: formatQuantity },
  { key: 'rate', title: 'Rate', format: formatAmount },
  { key: 'amount', title: 'Amount', format: formatAmount },
];

function cellValue(column, item, index) {
  const value = column.key === 'srNo' ? index + 1 : item[column.key];
  return column.format && value !== '' && value != null ? column.format(value) : value;
}

/**
 * Product grid: header, one row per item, and the totals row. The body has a fixed
 * height (as on the printed form); unused rows stay blank.
 */
export default function ProductTable({ items, totalQty, totalAmount }) {
  if (import.meta.env.DEV && items.length > L.maxRows) {
    console.warn(`ProductTable: ${items.length} items exceed the ${L.maxRows} rows that fit on the page.`);
  }

  return (
    <g className="product-table">
      <HLine y={L.headerTop} x1={FRAME.left} x2={FRAME.right} />
      <HLine y={L.headerBottom} x1={FRAME.left} x2={FRAME.right} />
      <HLine y={L.bodyBottom} x1={FRAME.left} x2={FRAME.right} />
      {L.columnRules.map((rule) => (
        <VLine key={rule.x} x={rule.x} y1={L.headerTop} y2={rule.y2} />
      ))}

      {COLUMNS.map((column) => (
        <Text key={column.key} {...L.headings[column.key]}>
          {column.title}
        </Text>
      ))}

      {items.map((item, index) => (
        <g key={index} className="product-row">
          {COLUMNS.map((column) => (
            <Text key={column.key} {...L.cells[column.key]} offsetY={index * L.rowHeight}>
              {cellValue(column, item, index)}
            </Text>
          ))}
        </g>
      ))}

      <Text {...L.totals.label}>Total</Text>
      <Text {...L.totals.qty}>{formatQuantity(totalQty)}</Text>
      <Text {...L.totals.amount}>{formatAmount(totalAmount)}</Text>
    </g>
  );
}
