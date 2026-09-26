# Sales Bill (billing-pdf)

A frontend-only React app for making GST tax invoices that look exactly like
`SalesBill_UI_404_26-27.PDF`. Fill in the form, check the live preview and click
**Download PDF**. No backend is involved.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/ (host it anywhere)
```

## Use

- **Form (left):** invoice number and date, buyer, ship-to (with *Same as buyer*),
  transport, items (up to 26 rows), GST type and rate, and a note. Seller, bank and
  terms details sit in the collapsed sections at the bottom.
- **Preview (right):** the invoice at 100%, updated as you type.
- **Download PDF:** saves `SalesBill_<invoice no>.pdf` directly.
- **Print:** opens the browser print dialog. Choose *Save as PDF* for a PDF with the
  fonts embedded. Keep *Margins: Default* and *Scale: Default*; the page size is fixed
  by the page itself.
- **New Invoice:** keeps seller, bank, tax and terms details, clears the rest, bumps
  the invoice number (`UI/404/26-27` → `UI/405/26-27`) and sets today's date.

The form is saved in the browser (`localStorage`), so a refresh does not lose work.
Totals, taxes and amounts in words are calculated from the items and GST rate.

## How the design stays identical to the original

- **Page.** The original page is 594.75 × 841.5 pt, which is exactly 793 × 1122 CSS px.
  The invoice is one SVG of that size, and `@page { size: 793px 1122px; margin: 0 }`
  sets the paper for printing.
- **Coordinates.** Every line, shaded panel and text position was measured from the
  original PDF's drawing commands and lives in `src/invoice/layout.js`. Components only
  place data into those slots.
- **Lines.** The rules are SVG strokes of exactly 1pt, like the original. CSS borders
  would be rounded to whole pixels (0.75pt).
- **Text.** Text is placed by baseline, left/centre/right anchored like the original,
  with no kerning. It uses the original's fonts: Verdana, Tahoma and Times New Roman.
- **Paint order.** The SVG draws in the same order as the original wherever a grey
  panel overlaps a line (see the comment in `src/invoice/Invoice.jsx`).
- **Download PDF.** `src/pdf/` turns the preview's SVG into PDF drawing commands at the
  same coordinates, with the same page size and the same font references and character
  widths as the original. Rendered at 96 or 192 DPI, the downloaded PDF is
  pixel-for-pixel identical to the original.

### Fonts

Like the original file, the downloaded PDF refers to Verdana, Tahoma and Times New Roman
without embedding them. Windows and macOS have these fonts. If a customer opens the
invoice on a device without them (some Android or Linux viewers), send the
*Print → Save as PDF* version instead, which embeds the fonts.

## Project structure

```
src/
  App.jsx                 form + preview + actions
  data/
    invoice.js            sample invoice (the original PDF's data)
    invoiceModel.js       form draft -> printable invoice, "New Invoice", GST types
    draftStorage.js       saves the draft in localStorage
  form/                   InvoiceForm, PartyFields, ItemsEditor, field components
  invoice/
    Invoice.jsx           the page (SVG); section order = paint order
    layout.js             all geometry, measured from the original PDF
    primitives.jsx        Text, HLine, VLine, Panel
    measure.js            text width / wrapping (same metrics as the PDF)
    components/           InvoiceHeader, CompanyDetails, BuyerDetails, ShippingDetails,
                          ProductTable, TaxSummary, AmountSummary, BankDetails,
                          TermsAndConditions, SignatureSection, ...
  pdf/
    invoicePdf.js         SVG -> PDF drawing commands
    pdfDocument.js        minimal PDF file writer
    fontMetrics.js        character widths of the seven fonts
  utils/                  formatting, amount in words, totals, dates
```

## Limits

- Up to 26 item rows (the height of the table on the page).
- Amounts in words wrap onto a second line when long; other fields have length limits
  so their text stays inside its box on the page.
