# Sales Bill (billing-pdf)

A GST tax invoice app (React + Express + MongoDB). Fill in the form, check the live
preview and click **Download PDF**. The invoice looks exactly like
`SalesBill_UI_404_26-27.PDF`, and the PDF itself is still made in the browser.

- **Accounts.** Sign up / log in with email and password. Everyone sees only their own data.
- **Automatic saving.** *Save*, *Download PDF* and *Print* store the invoice in **History**.
  The seller's main details (company, bank, terms, jurisdiction) are kept on the account, and
  every buyer is kept as a **saved buyer**. Items, prices and quantities are never stored as
  reusable details; they live only inside the invoice they belong to.
- **History.** Search, filter by status or date, reopen, duplicate, mark paid / unpaid,
  delete, and export a CSV for your accountant. Every PDF you download is **stored as the
  actual file**, so you can download exactly what you sent, again, any time.
- **Dashboard.** Total sales, GST collected, invoices, amount still to receive, average
  invoice, buyers, sales by month, top buyers, top items and the latest invoices, for this
  month, the last 30 days, this financial year (April to March) or all time.

## Set up

You need Node 20.6+ and a MongoDB database (a free MongoDB Atlas cluster works).

```bash
npm install
cp .env.example .env     # then fill in MONGOURL and JWT_SECRET
npm run dev              # app: http://localhost:5173  (API: http://localhost:4000)
```

`.env` (never commit it; it is git-ignored):

| Variable | Required | What it is |
| --- | --- | --- |
| `MONGOURL` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | 32+ random characters that sign login cookies. `node -p "require('crypto').randomBytes(48).toString('hex')"` makes one |
| `MONGO_DB` | no | Database name (default `billing-pdf`; the URL itself has none) |
| `PORT` | no | API port (default `4000`) |
| `NODE_ENV=production` | no | Serve the built app and use secure cookies |
| `COOKIE_SECURE` | no | `true` / `false` to override the secure-cookie default |
| `TRUST_PROXY` | no | e.g. `1` when running behind a reverse proxy, so rate limits see real IPs |

On MongoDB Atlas, allow your IP under *Network Access*, or the server cannot connect.

### Scripts

```bash
npm run dev          # API + Vite together (the browser only talks to Vite, which proxies /api)
npm run build        # React app into dist/
npm start            # production: one Node process serves dist/ and the API
npm run test:server  # API tests (use a throwaway database, dropped afterwards)
npm run lint
```

To run in production: `npm run build`, then `NODE_ENV=production npm start`
(set `MONGOURL` and `JWT_SECRET` in the host's environment). The app and API share one
address, so no CORS setup is needed.

## Use

- **Billing (form left, preview right):** invoice number and date, buyer (or pick a saved
  buyer), ship-to (with *Same as buyer*), transport, items (up to 26 rows), GST type and
  rate, and a note. Seller, bank and terms details sit in the collapsed sections at the bottom.
- **Save:** stores the invoice in history. Saving an invoice number that already exists
  updates that invoice (its paid / unpaid status and PDF count are kept).
- **Download PDF:** saves `SalesBill_<invoice no>.pdf`, then stores the invoice in history
  together with a copy of that PDF file. If it cannot be stored (for example the buyer's
  name is missing) the PDF is still made and the reason is shown.
- **PDFs in History:** the *PDF* button downloads the stored file. If the invoice was edited
  after its last PDF, it makes a new one from the invoice as it is now (so the button always
  gives the current invoice). Click the count (for example *2 · 12/10/2026*) to list every
  stored file. The latest 10 per invoice are kept; deleting an invoice deletes its files.
  *Print* is only counted: the browser's print dialog gives the app no file to keep.
- **Print:** stores the invoice, then opens the browser print dialog. Choose *Save as PDF*
  for a PDF with the fonts embedded. Keep *Margins: Default* and *Scale: Default*; the page
  size is fixed by the page itself.
- **New Invoice:** keeps the seller, bank, tax and terms details, clears the rest, offers the
  next invoice number (`UI/404/26-27` → `UI/405/26-27`) and today's date.
- **Unsaved work:** the invoice being edited is also kept in this browser, so a refresh does
  not lose it. You are asked before it is replaced (opening from history, logging out).
  A cash memo is saved as paid; a debit memo as unpaid.

Totals, taxes and amounts in words are calculated from the items and GST rate. The server
recalculates them with the same code, so history and the dashboard always match the PDF.

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

## API

JSON over HTTP, cookie session (`httpOnly`, `SameSite=Lax`). Everything except
`/api/auth/*` and `/api/health` needs a login.

| Method and path | Does |
| --- | --- |
| `POST /api/auth/register`, `login`, `logout`; `GET /api/auth/me` | Accounts |
| `GET` / `PUT /api/profile` | Seller's main details |
| `GET /api/customers`, `DELETE /api/customers/:id` | Saved buyers |
| `GET /api/invoices?q&status&from&to&page&limit` | History |
| `POST /api/invoices` `{ draft, event }` | Save (create, or update by invoice number) |
| `GET /api/invoices/:id`, `DELETE` | One invoice with its full draft; delete |
| `PATCH /api/invoices/:id/status` | Mark paid / unpaid |
| `POST /api/invoices/:id/pdfs` (body: the PDF, `application/pdf`) | Store a PDF file for the invoice |
| `GET /api/invoices/:id/pdfs`, `GET /api/invoices/:id/pdfs/:pdfId` | List stored PDFs; download one |
| `GET /api/invoices/next-number`, `GET /api/invoices/export.csv` | Next number; CSV |
| `GET /api/stats?from&to` | Dashboard numbers |

MongoDB collections: `users` (with the seller profile), `customers`, `invoices` (searchable
fields, calculated totals, status, PDF count, and the full form `draft`) and `invoicepdfs`
(the PDF files, about 15 KB each, kept apart so listing invoices never loads them).
Passwords are hashed with bcrypt; login attempts are rate limited.

## Project structure

```
server/
  index.js, app.js        start-up; Express app (helmet, JSON, cookies, routes)
  config.js, db.js        environment; MongoDB connection
  middleware/             sessions (JWT cookie), error handling
  models/                 User (+ seller profile), Customer, Invoice, InvoicePdf, shared field shapes
  routes/                 auth, profile, customers, invoices, stats
  lib/                    invoice validation + totals, filters, CSV, seller details
  test/api.test.js        API tests
src/
  App.jsx, main.jsx       routes; providers
  api/api.js              fetch client for the API
  auth/                   login state (AuthProvider, useAuth)
  components/             AppShell (navigation), RequireAuth
  pages/                  LoginPage, BillingPage, HistoryPage, DashboardPage
  data/
    invoice.js            sample invoice (the original PDF's data)
    invoiceModel.js       form draft -> printable invoice, "New Invoice", GST types
    draftStorage.js       the invoice being edited, kept per account in the browser
  form/                   InvoiceForm, PartyFields, ItemsEditor, CustomerPicker, field components
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
    renderInvoicePdf.jsx  the same PDF for an invoice that is not on screen (History)
  utils/                  formatting, amount in words, totals, dates
```

## Limits

- Up to 26 item rows (the height of the table on the page).
- Amounts in words wrap onto a second line when long; other fields have length limits
  so their text stays inside its box on the page.
- No password reset yet (it needs an email service), and no way to delete a saved buyer
  from the screen (the API supports it).
