const pad = (n) => String(n).padStart(2, '0');

/** Date -> "25/09/2026", the format printed on the invoice. */
export const formatDisplayDate = (date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/** Date -> "2026-09-25" in local time: the form the server's ?from= and ?to= filters expect. */
export const toIsoDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** An invoice date from the server ("2026-09-25T00:00:00.000Z", stored at UTC midnight) -> "25/09/2026". */
export function serverDateToDisplay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/** "25/09/2026" -> "2026-09-25" (value of an <input type="date">); "" if unparseable. */
export function displayToIsoDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : '';
}

/** "2026-09-25" -> "25/09/2026"; "" if unparseable. */
export function isoToDisplayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}
