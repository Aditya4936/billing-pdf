/**
 * Sample invoice, transcribed from SalesBill_UI_404_26-27.PDF. The form starts from
 * this data until the user's own draft is saved.
 *
 * Only source values live here. Line amounts, totals, taxes and the amounts in
 * words are calculated from `items` and `taxes` (see utils/totals.js).
 */
export const invoice = {
  memoType: 'Debit Memo',
  title: 'TAX INVOICE',
  copy: 'Original',
  invoiceNo: 'UI/404/26-27',
  date: '25/09/2026',

  company: {
    name: 'UNIQOO INDUSTRIES',
    addressLines: [
      'TARAVIYA SANALA ROAD, SURVAY NO.224/1 PAIKI 7 PAIKI 2,',
      'UNIQOO INDUSTRIES, Morbi Halvad Road, ROLLZA GRANITO LLP, Morbi',
    ],
    email: 'uniqooindustries@gmail.com',
    mobile: '8488028888',
    pan: 'AAIFU7221R',
    gstin: '24AAIFU7221R1ZM',
    udyam: '',
  },

  buyer: {
    name: 'OAKLEAF BATH STUDIO',
    addressLines: [
      '6, Flat No 601, Shiv Ganga Appartment, Morbi Bypass, 0,',
      '874/3 Or 878 Paiki, Plot No 6, Morbi, Mo Gujarat, 363641',
    ],
    city: 'MORBI',
    pincode: '363641',
    placeOfSupply: '24-Gujarat',
    pan: 'AAKFO3669D',
    gstin: '24AAKFO3669D1Z7',
  },

  shipToSameAsBuyer: true,
  shipTo: {
    name: 'OAKLEAF BATH STUDIO',
    addressLines: [
      '6, Flat No 601, Shiv Ganga Appartment, Morbi Bypass, 0,',
      '874/3 Or 878 Paiki, Plot No 6, Morbi, Mo Gujarat, 363641',
    ],
    city: 'MORBI',
    pincode: '363641',
    placeOfSupply: '24-Gujarat',
    pan: 'AAKFO3669D',
    gstin: '24AAKFO3669D1Z7',
  },

  transporter: {
    name: 'SELF',
    lrNo: '',
    vehicleNo: 'GJ36W3890',
  },

  items: [
    { name: 'PLANET-1048', hsn: '69101000', size: 'PrimarySize', grade: '', qty: 4, rate: 1500 },
    { name: 'PLANET-1028', hsn: '69101000', size: 'PrimarySize', grade: '', qty: 2, rate: 1500 },
    { name: 'PLANET-1011', hsn: '69101000', size: 'PrimarySize', grade: '', qty: 2, rate: 1500 },
  ],

  taxes: [
    { label: 'Central Tax', rate: 9 },
    { label: 'State/UT Tax', rate: 9 },
  ],

  bank: {
    name: 'HDFC BANK',
    accountNo: '99999888811008',
    ifsc: 'HDFC0000307',
  },

  note: '',

  terms: [
    'Goods once sold will not be taken back.',
    'Interest @18% p.a. will be charged if payment is not made within due date.',
    'Our risk and responsibility ceases as soon as the goods leave our premises.',
  ],
  // Printed as the last numbered term, with its number and text as separate runs.
  jurisdiction: `"Subject to 'Morbi' Jurisdiction only.   E.&.O.E"`,
};
