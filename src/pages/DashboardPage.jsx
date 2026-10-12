import './DashboardPage.css';
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api.js';
import { serverDateToDisplay, toIsoDay } from '../utils/date.js';
import { formatIndianAmount, formatRupees } from '../utils/format.js';
import MonthlyChart from './MonthlyChart.jsx';

const RANGES = [
  { id: 'fy', label: 'This financial year' },
  { id: 'month', label: 'This month' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
];

/** The ?from= / ?to= dates for a range. The financial year runs April to March. */
function datesFor(rangeId, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  if (rangeId === 'month') return { from: toIsoDay(new Date(year, month, 1)), to: toIsoDay(new Date(year, month + 1, 0)) };
  if (rangeId === 'last30') return { from: toIsoDay(new Date(year, month, now.getDate() - 29)), to: toIsoDay(now) };
  if (rangeId === 'fy') {
    const start = month >= 3 ? year : year - 1;
    return { from: `${start}-04-01`, to: `${start + 1}-03-31` };
  }
  return {};
}

function Kpi({ label, value, note }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {note && <span className="kpi-note">{note}</span>}
    </div>
  );
}

/** Sales numbers for a period: totals, month-by-month chart, best buyers and items. */
export default function DashboardPage() {
  const rangeId = useId();
  const [range, setRange] = useState('fy');
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState({ key: '', stats: null, error: '' });

  const requestKey = `${range}:${reloads}`;
  useEffect(() => {
    let active = true;
    api.stats.get(datesFor(range)).then(
      (stats) => active && setResult({ key: requestKey, stats, error: '' }),
      (error) => active && setResult((previous) => ({ key: requestKey, stats: previous.stats, error: error.message })),
    );
    return () => {
      active = false;
    };
  }, [range, requestKey]);

  const { stats, error } = result;
  const isLoading = result.key !== requestKey;
  const totals = stats?.totals;
  const everythingEmpty = totals && range === 'all' && totals.invoices === 0;

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-head">
          <h1>Dashboard</h1>
          <div className="range-picker">
            <label htmlFor={rangeId}>Period</label>
            <select id={rangeId} value={range} onChange={(event) => setRange(event.target.value)}>
              {RANGES.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="notice error" role="alert">
            Could not load the numbers. {error}{' '}
            <button type="button" className="link-button" onClick={() => setReloads((count) => count + 1)}>
              Try again
            </button>
          </p>
        )}

        {!stats && isLoading && <p className="page-message">Loading numbers…</p>}

        {everythingEmpty && (
          <div className="empty">
            <h2>No sales to show yet</h2>
            <p>Save or download your first invoice and the numbers appear here.</p>
            <Link className="button primary" to="/">
              Create an invoice
            </Link>
          </div>
        )}

        {stats && !everythingEmpty && (
          <div className={isLoading ? 'is-stale' : undefined} aria-busy={isLoading}>
            <section className="kpis" aria-label="Totals for the period">
              <Kpi label="Total sales" value={formatRupees(totals.sales)} note={`${formatRupees(totals.taxable)} before GST`} />
              <Kpi label="Invoices" value={totals.invoices} note={`${totals.invoices - totals.unpaidCount} paid · ${totals.unpaidCount} unpaid`} />
              <Kpi label="GST collected" value={formatRupees(totals.gst)} />
              <Kpi
                label="Still to receive"
                value={formatRupees(totals.unpaidAmount)}
                note={`${formatRupees(totals.paidAmount)} received`}
              />
              <Kpi label="Average invoice" value={formatRupees(totals.averageInvoice)} />
              <Kpi label="Buyers" value={totals.customers} />
            </section>

            <section className="card">
              <h2>Sales by month</h2>
              <p className="card-note">Last 12 months, including GST.</p>
              <MonthlyChart months={stats.monthly} />
            </section>

            <div className="dash-grid">
              <section className="card">
                <h2>Top buyers</h2>
                {stats.topCustomers.length === 0 ? (
                  <p className="card-empty">No sales in this period.</p>
                ) : (
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th scope="col">Buyer</th>
                        <th scope="col" className="num">
                          Invoices
                        </th>
                        <th scope="col" className="num">
                          Sales
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topCustomers.map((buyer) => (
                        <tr key={buyer.name}>
                          <td>{buyer.name}</td>
                          <td className="num">{buyer.invoices}</td>
                          <td className="num">{formatRupees(buyer.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>

              <section className="card">
                <h2>Top items</h2>
                {stats.topItems.length === 0 ? (
                  <p className="card-empty">No sales in this period.</p>
                ) : (
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th scope="col">Item</th>
                        <th scope="col" className="num">
                          Quantity
                        </th>
                        <th scope="col" className="num">
                          Sales (before GST)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topItems.map((item) => (
                        <tr key={item.name}>
                          <td>{item.name}</td>
                          <td className="num">{formatIndianAmount(item.qty)}</td>
                          <td className="num">{formatRupees(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>

            <section className="card">
              <div className="card-head">
                <h2>Latest invoices</h2>
                <Link to="/invoices">View all</Link>
              </div>
              {stats.recent.length === 0 ? (
                <p className="card-empty">Nothing saved yet.</p>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th scope="col">Invoice no.</th>
                      <th scope="col">Date</th>
                      <th scope="col">Buyer</th>
                      <th scope="col" className="num">
                        Amount
                      </th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent.map((row) => (
                      <tr key={row.id}>
                        <td className="strong">{row.invoiceNo}</td>
                        <td>{serverDateToDisplay(row.invoiceDate)}</td>
                        <td>{row.buyerName}</td>
                        <td className="num">{formatRupees(row.totals.grandTotal)}</td>
                        <td>
                          <span className={`badge ${row.status}`}>{row.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
