export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/** 4 -> "4.000" (quantities are printed with three decimals). */
export const formatQuantity = (value) => Number(value).toFixed(3);

/** 6000 -> "6000.00" (table and tax amounts are printed without grouping). */
export const formatAmount = (value) => round2(value).toFixed(2);

/** 9 -> "9.00%" */
export const formatPercent = (value) => `${Number(value).toFixed(2)}%`;

const INDIAN_CURRENCY = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 14160 -> "14,160.00", 141600 -> "1,41,600.00" (used for the Grand Total). */
export const formatIndianAmount = (value) => INDIAN_CURRENCY.format(round2(value));

/** 141600 -> "₹1,41,600.00" (history and dashboard). */
export const formatRupees = (value) => `₹${formatIndianAmount(value)}`;

/** Short labels for chart bars: 4500 -> "₹4.5K", 250000 -> "₹2.5L", 12000000 -> "₹1.2Cr". */
export function formatCompactRupees(value) {
  const trim = (n) => String(Math.round(n * 10) / 10);
  if (value >= 1e7) return `₹${trim(value / 1e7)}Cr`;
  if (value >= 1e5) return `₹${trim(value / 1e5)}L`;
  if (value >= 1e3) return `₹${trim(value / 1e3)}K`;
  return `₹${Math.round(value)}`;
}
