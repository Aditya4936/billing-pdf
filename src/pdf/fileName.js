/** "UI/404/26-27" -> "SalesBill_UI_404_26-27", the original file's naming. */
export const fileNameFor = (invoiceNo) => `SalesBill_${(invoiceNo || 'Invoice').replace(/[^A-Za-z0-9-]+/g, '_')}`;
