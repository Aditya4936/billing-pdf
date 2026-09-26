const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  return [TENS[Math.floor(n / 10)], ONES[n % 10]].filter(Boolean).join(' ');
}

function belowThousand(n) {
  const hundreds = Math.floor(n / 100);
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', belowHundred(n % 100)].filter(Boolean).join(' ');
}

/** Whole number in words using the Indian system (Crore, Lakh, Thousand). */
export function numberToWords(value) {
  let n = Math.floor(value);
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10_000_000);
  n %= 10_000_000;
  const lakh = Math.floor(n / 100_000);
  n %= 100_000;
  const thousand = Math.floor(n / 1_000);
  n %= 1_000;

  return [
    crore ? `${numberToWords(crore)} Crore` : '',
    lakh ? `${belowHundred(lakh)} Lakh` : '',
    thousand ? `${belowHundred(thousand)} Thousand` : '',
    belowThousand(n),
  ]
    .filter(Boolean)
    .join(' ');
}

/** 14160 -> "Fourteen Thousand One Hundred Sixty Only" (paise are added when present). */
export function amountInWords(amount) {
  if (amount < 0) return `Minus ${amountInWords(-amount)}`;
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (paise === 0) return `${numberToWords(rupees)} Only`;
  if (rupees === 0) return `${belowHundred(paise)} Paise Only`;
  return `${numberToWords(rupees)} and ${belowHundred(paise)} Paise Only`;
}
