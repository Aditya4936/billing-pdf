import { HttpError } from '../middleware/errors.js';

/** "2026-09-25" -> Date at UTC midnight (how invoice dates are stored); null when absent. */
export function parseDay(value, label) {
  if (value === undefined || value === '') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${label} must be a date like 2026-09-25.`);
  }
  return date;
}

/** A date range as a MongoDB condition on invoiceDate (both ends included), or undefined. */
export function dateRange(query) {
  const from = parseDay(query.from, 'From');
  const to = parseDay(query.to, 'To');
  if (from && to && from > to) throw new HttpError(400, 'The From date must not be after the To date.');
  if (!from && !to) return undefined;
  return { ...(from && { $gte: from }), ...(to && { $lte: to }) };
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The MongoDB filter for "this user's invoices matching ?q= ?status= ?from= ?to=". */
export function invoiceFilter(userId, query) {
  const filter = { user: userId };

  const status = typeof query.status === 'string' ? query.status : '';
  if (status) {
    if (!['paid', 'unpaid'].includes(status)) throw new HttpError(400, 'Status must be paid or unpaid.');
    filter.status = status;
  }

  const range = dateRange(query);
  if (range) filter.invoiceDate = range;

  const q = typeof query.q === 'string' ? query.q.trim().slice(0, 60) : '';
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ invoiceNo: pattern }, { buyerName: pattern }, { buyerGstin: pattern }];
  }
  return filter;
}
