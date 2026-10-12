import { Router } from 'express';
import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';
import { dateRange } from '../lib/filters.js';
import { invoiceSummary } from '../lib/invoiceService.js';
import { round2 } from '../../src/utils/format.js';

const MONTHS_SHOWN = 12;

// A buyer is identified by GSTIN, or by name when there is none (same rule as saved customers).
const BUYER_KEY = { $cond: [{ $ne: ['$buyerGstin', ''] }, '$buyerGstin', { $toLower: '$buyerName' }] };
const sumWhen = (status, field) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, field, 0] } });

/** The last `count` months as 'YYYY-MM', oldest first, ending with the current month. */
function lastMonths(count, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1));
    return date.toISOString().slice(0, 7);
  });
}

export function statsRouter({ sessions }) {
  const router = Router();
  router.use(sessions.requireAuth);

  // Dashboard numbers. ?from= ?to= (YYYY-MM-DD) limit the totals and top lists;
  // the month-by-month chart always shows the last 12 months.
  router.get('/', async (req, res) => {
    const user = new mongoose.Types.ObjectId(req.user.id);
    const range = dateRange(req.query);
    const match = { user, ...(range && { invoiceDate: range }) };

    const months = lastMonths(MONTHS_SHOWN);
    const firstMonth = new Date(`${months[0]}-01T00:00:00.000Z`);

    const [[summary], monthly] = await Promise.all([
      Invoice.aggregate([
        { $match: match },
        {
          $facet: {
            totals: [
              {
                $group: {
                  _id: null,
                  invoices: { $sum: 1 },
                  sales: { $sum: '$totals.grandTotal' },
                  taxable: { $sum: '$totals.taxableAmount' },
                  gst: { $sum: '$totals.totalTax' },
                  paidAmount: sumWhen('paid', '$totals.grandTotal'),
                  unpaidAmount: sumWhen('unpaid', '$totals.grandTotal'),
                  unpaidCount: sumWhen('unpaid', 1),
                },
              },
            ],
            customerCount: [{ $group: { _id: BUYER_KEY } }, { $count: 'count' }],
            topCustomers: [
              {
                $group: {
                  _id: BUYER_KEY,
                  name: { $first: '$buyerName' },
                  invoices: { $sum: 1 },
                  sales: { $sum: '$totals.grandTotal' },
                },
              },
              { $sort: { sales: -1 } },
              { $limit: 5 },
            ],
            topItems: [
              { $unwind: '$items' },
              {
                $group: {
                  _id: { $toLower: '$items.name' },
                  name: { $first: '$items.name' },
                  qty: { $sum: '$items.qty' },
                  amount: { $sum: '$items.amount' },
                },
              },
              { $sort: { amount: -1 } },
              { $limit: 5 },
            ],
            recent: [
              { $sort: { createdAt: -1 } },
              { $limit: 5 },
              { $project: { draft: 0, items: 0, taxes: 0 } },
            ],
          },
        },
      ]),
      Invoice.aggregate([
        { $match: { user, invoiceDate: { $gte: firstMonth } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
            sales: { $sum: '$totals.grandTotal' },
            invoices: { $sum: 1 },
          },
        },
      ]),
    ]);

    const t = summary.totals[0] ?? {};
    const invoices = t.invoices ?? 0;
    const byMonth = new Map(monthly.map((m) => [m._id, m]));

    res.json({
      range: { from: req.query.from || null, to: req.query.to || null },
      totals: {
        invoices,
        sales: round2(t.sales ?? 0),
        taxable: round2(t.taxable ?? 0),
        gst: round2(t.gst ?? 0),
        averageInvoice: invoices ? round2((t.sales ?? 0) / invoices) : 0,
        customers: summary.customerCount[0]?.count ?? 0,
        paidAmount: round2(t.paidAmount ?? 0),
        unpaidAmount: round2(t.unpaidAmount ?? 0),
        unpaidCount: t.unpaidCount ?? 0,
      },
      monthly: months.map((month) => ({
        month,
        sales: round2(byMonth.get(month)?.sales ?? 0),
        invoices: byMonth.get(month)?.invoices ?? 0,
      })),
      topCustomers: summary.topCustomers.map(({ name, invoices: count, sales }) => ({
        name,
        invoices: count,
        sales: round2(sales),
      })),
      topItems: summary.topItems.map(({ name, qty, amount }) => ({ name, qty: round2(qty), amount: round2(amount) })),
      recent: summary.recent.map(invoiceSummary),
    });
  });

  return router;
}
