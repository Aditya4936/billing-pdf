/**
 * Invoice geometry, measured from the reference PDF (SalesBill_UI_404_26-27.PDF).
 *
 * Units are CSS px with the origin at the page's top-left corner. The reference
 * MediaBox is 594.75 x 841.5 pt, which is exactly 793 x 1122 px (1px = 0.75pt),
 * so every value here is the PDF coordinate divided by 0.75 with the y axis flipped.
 *
 * Text slots use the PDF's own model: `y` is the baseline and `x` is the anchor for
 * `align` — the left edge, the centre, or the right edge of the text. Slight
 * irregularities (a label 1px lower than its neighbour, a colon 1px higher) are
 * copied from the reference on purpose.
 */

// Font presets: family, size (pt) and weight/style, matching the PDF's font resources.
const TIMES_8 = { font: 'times', size: 8 };
const TIMES_8_B = { font: 'times', size: 8, bold: true };
const TIMES_9 = { font: 'times', size: 9 };
const TIMES_9_B = { font: 'times', size: 9, bold: true };
const TIMES_10 = { font: 'times', size: 10 };
const TIMES_11_B = { font: 'times', size: 11, bold: true };
const TIMES_18_B = { font: 'times', size: 18, bold: true };
const VERDANA_7 = { font: 'verdana', size: 7 };
const VERDANA_7_B = { font: 'verdana', size: 7, bold: true };
const VERDANA_7_I = { font: 'verdana', size: 7, italic: true };
const VERDANA_8 = { font: 'verdana', size: 8 };
const VERDANA_8_B = { font: 'verdana', size: 8, bold: true };
const VERDANA_8_I = { font: 'verdana', size: 8, italic: true };
const VERDANA_9_B = { font: 'verdana', size: 9, bold: true };
const VERDANA_10_B = { font: 'verdana', size: 10, bold: true };
const TAHOMA_8 = { font: 'tahoma', size: 8 };
const TAHOMA_8_B = { font: 'tahoma', size: 8, bold: true };

const at = (x, y, style, align = 'left') => ({ x, y, align, ...style });

export const PAGE = { width: 793, height: 1122 };

export const FRAME = { left: 34.8, right: 753.8, top: 28.2, bottom: 1073.8 };

export const COMPANY = {
  band: { x: 34.8, y: 28.2, width: 719, height: 38 },
  name: at(393.8, 58.52, TIMES_18_B, 'center'),
  address: at(394.3, 87.053, TIMES_10, 'center'),
  addressLineHeight: 18,
  emailLabel: at(39.8, 121.624, VERDANA_8_B),
  email: at(95.8, 121.4, VERDANA_8),
  mobileLabel: at(593.8, 121.624, VERDANA_8_B),
  mobile: at(626.8, 122.4, VERDANA_8),
};

export const TITLE_STRIP = {
  top: 125.2,
  bottom: 146.2,
  memoType: at(37.8, 140.624, VERDANA_8_B),
  title: at(397.8, 142.48, VERDANA_10_B, 'center'),
  copy: at(749.8, 140.624, VERDANA_8_B, 'right'),
};

export const PARTIES = {
  band: { x: 34.8, y: 146.2, width: 719, height: 19 },
  // Stops 2px short of the table's top rule, as in the reference.
  divider: { x: 392.8, y1: 146.2, y2: 377.2 },
  buyerHeading: at(164.8, 160.453, TIMES_8_B),
  shipToHeading: at(537.8, 160.453, TIMES_8_B),
  buyer: {
    msLabel: at(42.8, 180.86, TIMES_9_B),
    name: at(86.8, 183.673, TIMES_11_B),
    address: at(86.8, 230.668, TIMES_9),
    addressLineHeight: 16,
    cityLine: at(86.8, 262.86, TIMES_9_B),
    placeOfSupplyLabel: at(40.8, 278.86, TIMES_9_B),
    placeOfSupply: at(132.8, 278.4, VERDANA_8),
    panLabel: at(41.8, 295.86, TIMES_9_B),
    panColon: at(124.8, 295.86, TIMES_9_B),
    pan: at(132.8, 297.668, TIMES_9),
    gstinLabel: at(40.8, 312.86, TIMES_9_B),
    gstinColon: at(124.8, 312.86, TIMES_9_B),
    gstin: at(132.8, 314.668, TIMES_9),
  },
  shipTo: {
    msLabel: at(399.8, 180.86, TIMES_9_B),
    name: at(445.8, 183.673, TIMES_11_B),
    address: at(445.8, 230.668, TIMES_9),
    addressLineHeight: 16,
    // The ship-to city line is set in Verdana Bold, unlike the buyer's (reference quirk).
    cityLine: at(445.8, 261.624, VERDANA_8_B),
    placeOfSupplyLabel: at(395.8, 278.86, TIMES_9_B),
    placeOfSupply: at(488.8, 278.4, VERDANA_8),
    panLabel: at(396.8, 295.86, TIMES_9_B),
    panColon: at(479.8, 295.86, TIMES_9_B),
    pan: at(488.8, 297.668, TIMES_9),
    gstinLabel: at(394.8, 312.86, TIMES_9_B),
    gstinColon: at(479.8, 312.86, TIMES_9_B),
    gstin: at(487.8, 314.668, TIMES_9),
  },
};

export const TRANSPORT = {
  top: { y: 319.2, x1: 35.8, x2: 752.8 },
  label: at(42.8, 334.453, TIMES_8_B),
  colon: at(129.8, 333.453, TIMES_8_B),
  value: at(141.8, 334.283, TIMES_8),
  rowHeight: 16,
};

export const INVOICE_META = {
  // 1px wider and taller than its cell, so it overlaps the frame and the table's
  // top rule. It must be painted after both (see Invoice.jsx).
  panel: { x: 392.8, y: 319.2, width: 362, height: 61 },
  label: at(396.8, 335.86, TIMES_9_B),
  colon: at(486.8, 335.86, TIMES_9_B),
  value: at(495.8, 336.86, TIMES_9_B),
  rowHeight: 26,
};

export const PRODUCT_TABLE = {
  headerTop: 379.2,
  headerBottom: 399.2,
  bodyBottom: 794.8,
  // Column separators; three of them continue down through the totals row.
  columnRules: [
    { x: 76.8, y2: 794.8 }, // SrNo | Product Name
    { x: 292.8, y2: 794.8 }, // Product Name | HSN/SAC
    { x: 355.8, y2: 794.8 }, // HSN/SAC | Size
    { x: 448.8, y2: 849.8 }, // Size | Grade
    { x: 505.8, y2: 849.8 }, // Grade | Qty
    { x: 577.8, y2: 850.8 }, // Qty | Rate
    { x: 655.8, y2: 794.8 }, // Rate | Amount
  ],
  headings: {
    srNo: at(43.8, 393.196, VERDANA_7_B),
    name: at(125.8, 393.196, VERDANA_7_B),
    hsn: at(304.8, 394.196, VERDANA_7_B),
    size: at(388.8, 391.196, VERDANA_7_B),
    grade: at(460.8, 391.196, VERDANA_7_B),
    qty: at(529.8, 393.196, VERDANA_7_B),
    rate: at(602.8, 393.196, VERDANA_7_B),
    amount: at(682.8, 393.196, VERDANA_7_B),
  },
  // Cell slots for the first row; each following row is `rowHeight` lower.
  cells: {
    srNo: at(73.8, 415.4, VERDANA_8, 'right'),
    name: at(80.8, 415.4, VERDANA_8),
    hsn: at(326.8, 415, VERDANA_7, 'center'),
    size: at(401.8, 414, VERDANA_7, 'center'),
    // Grade is empty in the reference; centred in its column like Size.
    grade: at(476.8, 414, VERDANA_7, 'center'),
    qty: at(574.8, 415.4, VERDANA_8, 'right'),
    rate: at(654.8, 415.4, VERDANA_8, 'right'),
    amount: at(751.8, 415.4, VERDANA_8, 'right'),
  },
  rowHeight: 15,
  // Rows that fit above the table's bottom rule.
  maxRows: 26,
  totals: {
    label: at(455.8, 819.652, VERDANA_9_B),
    qty: at(577.8, 818.224, VERDANA_8_B, 'right'),
    amount: at(750.8, 819.224, VERDANA_8_B, 'right'),
  },
};

export const COMPANY_TAX = {
  panLabel: at(37.8, 810.652, VERDANA_9_B),
  pan: at(101.8, 811.652, VERDANA_9_B),
  gstinLabel: at(37.8, 828.652, VERDANA_9_B),
  gstin: at(121.8, 829.652, VERDANA_9_B),
  udyamLabel: at(38.8, 845.652, VERDANA_9_B),
  // Empty in the reference; placed after the label, 1px below it like PAN/GSTIN.
  udyam: at(124.8, 846.652, VERDANA_9_B),
};

export const BANK = {
  top: { y: 849.8, x1: 33.8, x2: 528.8 },
  bottom: { y: 901.8, x1: 34.8, x2: 528.8 },
  // Bank Name, Bank A/c. No., RTGS/IFSC Code. Baselines vary slightly per row in the reference.
  rows: [
    {
      label: at(40.8, 864.16, TAHOMA_8_B),
      colon: at(145.8, 863.16, TAHOMA_8_B),
      value: at(157.8, 863.829, TAHOMA_8),
    },
    {
      label: at(40.8, 880.16, TAHOMA_8_B),
      colon: at(145.8, 880.16, TAHOMA_8_B),
      value: at(157.8, 879.829, TAHOMA_8),
    },
    {
      label: at(40.8, 897.16, TAHOMA_8_B),
      colon: at(145.8, 896.16, TAHOMA_8_B),
      value: at(157.8, 896.829, TAHOMA_8),
    },
  ],
};

export const TAX_SUMMARY = {
  top: { y: 849.8, x1: 527.8, x2: 752.8 },
  divider: { x: 529.8, y1: 850.8, y2: 966.8 },
  taxableLabel: at(534.8, 913.224, VERDANA_8_B),
  taxable: at(751.8, 913.224, VERDANA_8_B, 'right'),
  // Slots for the first tax row; each following row is `rowHeight` lower.
  taxLabel: at(534.8, 931, VERDANA_8),
  taxRate: at(674.8, 931, VERDANA_8, 'right'),
  taxAmount: at(750.8, 931, VERDANA_8, 'right'),
  rowHeight: 15,
};

export const AMOUNT_SUMMARY = {
  totalTaxLabel: at(40.8, 915.796, VERDANA_7_B),
  totalTaxWords: at(103.8, 917, VERDANA_8_I),
  billAmountLabel: at(40.8, 944.796, VERDANA_7_B),
  billAmountWords: at(111.8, 947, VERDANA_8_I),
  grandTotalPanel: { x: 529.8, y: 965.8, width: 224, height: 24 },
  grandTotalRule: { y: 965.8, x1: 529.8, x2: 753.8 },
  grandTotalLabel: at(534.8, 982.652, VERDANA_9_B),
  grandTotal: at(749.8, 983.652, VERDANA_9_B, 'right'),
};

export const NOTE = {
  top: { y: 965.8, x1: 34.8, x2: 532.8 },
  // Drawn over the Grand Total panel, 1px above its bottom edge: the doubled rule
  // under "Grand Total" in the reference.
  bottom: { y: 988.8, x1: 34.8, x2: 753.8 },
  label: at(36.8, 978.796, VERDANA_7_B),
  // Empty in the reference; placed after the label on the same baseline.
  text: at(72.8, 978.796, VERDANA_7),
};

export const TERMS = {
  heading: at(40.8, 1003.796, VERDANA_7_B),
  // Slot for the first numbered term; each following term is `rowHeight` lower.
  item: at(40.8, 1019.6, VERDANA_7_I),
  rowHeight: 15,
  // The jurisdiction clause follows the terms: its number and text are separate
  // runs, with the text 1px lower.
  clauseNumber: at(40.8, 1019.6, VERDANA_7_I),
  clauseText: at(52.8, 1020.6, VERDANA_7_I),
};

export const SIGNATURE = {
  forCompany: at(742.8, 1006, VERDANA_8, 'right'),
  signatory: at(632.8, 1063.6, VERDANA_7_I),
};
