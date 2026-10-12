import { formatCompactRupees, formatRupees } from '../utils/format.js';

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 24, right: 8, bottom: 30, left: 8 };

/** "2026-10" -> "Oct 26" */
function monthLabel(month) {
  const [year, number] = month.split('-').map(Number);
  const name = new Date(Date.UTC(year, number - 1, 1)).toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${name} ${String(year).slice(2)}`;
}

/** Sales per month as bars. `months`: [{ month: '2026-10', sales, invoices }], oldest first. */
export default function MonthlyChart({ months }) {
  const top = Math.max(...months.map((m) => m.sales), 1);
  const innerWidth = WIDTH - PAD.left - PAD.right;
  const innerHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerWidth / months.length;
  const barWidth = slot * 0.58;
  const baseline = PAD.top + innerHeight;

  return (
    <svg
      className="monthly-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label="Sales for each of the last 12 months, including GST"
    >
      <line x1={PAD.left} x2={WIDTH - PAD.right} y1={baseline} y2={baseline} stroke="#b5b5b5" />
      {months.map((entry, index) => {
        const height = (entry.sales / top) * innerHeight;
        const x = PAD.left + index * slot + (slot - barWidth) / 2;
        const centre = x + barWidth / 2;
        const detail = `${monthLabel(entry.month)}: ${formatRupees(entry.sales)} from ${entry.invoices} ${
          entry.invoices === 1 ? 'invoice' : 'invoices'
        }`;
        return (
          <g key={entry.month}>
            {entry.sales > 0 && (
              <>
                <rect x={x} y={baseline - height} width={barWidth} height={height} rx="2" fill="#1f1f1f">
                  <title>{detail}</title>
                </rect>
                <text x={centre} y={baseline - height - 6} textAnchor="middle" fontSize="11" fill="#1f1f1f">
                  {formatCompactRupees(entry.sales)}
                </text>
              </>
            )}
            <text x={centre} y={HEIGHT - 10} textAnchor="middle" fontSize="11" fill="#666">
              {monthLabel(entry.month)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
