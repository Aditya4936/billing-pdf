/**
 * API integration tests: `npm run test:server`.
 *
 * Runs the real app against MongoDB, but in a throwaway database named
 * billing-pdf-test-<random> that is dropped when the tests finish, so your data is untouched.
 */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';

process.env.MONGO_DB = `billing-pdf-test-${randomBytes(4).toString('hex')}`;
const { loadConfig } = await import('../config.js');
const { connectDb, disconnectDb } = await import('../db.js');
const { createApp } = await import('../app.js');

let server;
let base;

/** Minimal client that remembers a login cookie. */
function client() {
  let cookie = '';
  return {
    async call(method, path, body) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: { ...(body && { 'Content-Type': 'application/json' }), ...(cookie && { Cookie: cookie }) },
        body: body && JSON.stringify(body),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
      const type = response.headers.get('content-type') ?? '';
      const data = type.includes('json') ? await response.json() : await response.text();
      return { status: response.status, data, headers: response.headers };
    },
  };
}

const party = (name, extra = {}) => ({
  name,
  addressLines: ['1 Main Road', 'Morbi'],
  city: 'MORBI',
  pincode: '363641',
  placeOfSupply: '24-Gujarat',
  pan: 'AAKFO3669D',
  gstin: '24AAKFO3669D1Z7',
  ...extra,
});

const draft = (overrides = {}) => ({
  memoType: 'Debit Memo',
  title: 'TAX INVOICE',
  copy: 'Original',
  invoiceNo: 'UI/001/26-27',
  date: '25/09/2026',
  company: { name: 'UNIQOO INDUSTRIES', addressLines: ['Line 1', 'Line 2'], gstin: '24AAIFU7221R1ZM' },
  buyer: party('OAKLEAF BATH STUDIO'),
  shipToSameAsBuyer: true,
  shipTo: party(''),
  transporter: { name: 'SELF', lrNo: '', vehicleNo: 'GJ36W3890' },
  items: [
    { name: 'PLANET-1048', hsn: '69101000', size: '', grade: '', qty: '4', rate: '1500' },
    { name: 'PLANET-1028', hsn: '69101000', size: '', grade: '', qty: 2, rate: 1500 },
    { name: '', hsn: '', size: '', grade: '', qty: '', rate: '' }, // blank row: ignored
  ],
  taxes: [
    { label: 'Central Tax', rate: '9' },
    { label: 'State/UT Tax', rate: '9' },
  ],
  bank: { name: 'HDFC BANK', accountNo: '99999888811008', ifsc: 'HDFC0000307' },
  note: '',
  terms: ['Goods once sold will not be taken back.'],
  jurisdiction: "Subject to 'Morbi' Jurisdiction only.",
  ...overrides,
});

before(async () => {
  const config = loadConfig();
  await connectDb(config);
  server = createApp(config).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase();
  await disconnectDb();
});

describe('accounts', () => {
  const me = client();
  const credentials = { name: 'Aditya', email: 'Aditya@Example.com', password: 'correct horse' };

  test('the API answers and unknown routes are 404 JSON', async () => {
    assert.equal((await me.call('GET', '/api/health')).status, 200);
    assert.equal((await me.call('GET', '/api/nope')).status, 404);
  });

  test('protected routes need a login', async () => {
    for (const path of ['/api/auth/me', '/api/invoices', '/api/stats', '/api/profile', '/api/customers']) {
      assert.equal((await me.call('GET', path)).status, 401, path);
    }
  });

  test('registration rejects bad input with a readable message', async () => {
    const badEmail = await me.call('POST', '/api/auth/register', { ...credentials, email: 'nope' });
    assert.equal(badEmail.status, 400);
    assert.match(badEmail.data.error, /valid email/);
    const shortPassword = await me.call('POST', '/api/auth/register', { ...credentials, password: 'short' });
    assert.equal(shortPassword.status, 400);
    assert.match(shortPassword.data.error, /at least 8/);
  });

  test('register logs in with an httpOnly cookie and never returns the password hash', async () => {
    const response = await me.call('POST', '/api/auth/register', credentials);
    assert.equal(response.status, 201);
    assert.equal(response.data.user.email, 'aditya@example.com');
    assert.equal(JSON.stringify(response.data).includes('passwordHash'), false);
    const cookie = response.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.equal((await me.call('GET', '/api/auth/me')).data.user.name, 'Aditya');
  });

  test('the same email cannot register twice', async () => {
    const response = await client().call('POST', '/api/auth/register', { ...credentials, email: 'ADITYA@example.com' });
    assert.equal(response.status, 409);
  });

  test('login: wrong password and unknown email give the same answer', async () => {
    const wrongPassword = await client().call('POST', '/api/auth/login', { ...credentials, password: 'wrong password' });
    const unknownEmail = await client().call('POST', '/api/auth/login', { email: 'who@example.com', password: 'whatever1' });
    assert.equal(wrongPassword.status, 401);
    assert.deepEqual(wrongPassword.data, unknownEmail.data);
  });

  test('login works, and logout ends the session', async () => {
    const again = client();
    assert.equal((await again.call('POST', '/api/auth/login', credentials)).status, 200);
    assert.equal((await again.call('GET', '/api/auth/me')).status, 200);
    await again.call('POST', '/api/auth/logout');
    assert.equal((await again.call('GET', '/api/auth/me')).status, 401);
  });
});

describe('invoices, profile, customers and stats', () => {
  const owner = client();
  const stranger = client();

  before(async () => {
    await owner.call('POST', '/api/auth/register', { name: 'Owner', email: 'owner@example.com', password: 'password-one' });
    await stranger.call('POST', '/api/auth/register', { name: 'Other', email: 'other@example.com', password: 'password-two' });
  });

  test('a new account has no seller profile and no suggested invoice number', async () => {
    assert.equal((await owner.call('GET', '/api/profile')).data.profile, null);
    assert.equal((await owner.call('GET', '/api/invoices/next-number')).data.invoiceNo, null);
  });

  test('saving validates the invoice', async () => {
    const cases = [
      [draft({ invoiceNo: '' }), /invoice number/],
      [draft({ date: '31/02/2026' }), /valid invoice date/],
      [draft({ buyer: party('') }), /buyer's name/],
      [draft({ items: [] }), /at least one item/],
      [draft({ items: 'abc' }), /not valid/],
      [draft({ company: 'x' }), /not valid/],
      [draft({ items: [{ name: 'X', qty: '1e308', rate: '1e308' }] }), /too large/],
    ];
    for (const [body, message] of cases) {
      const response = await owner.call('POST', '/api/invoices', { draft: body });
      assert.equal(response.status, 400, JSON.stringify(response.data));
      assert.match(response.data.error, message);
    }
    assert.equal((await owner.call('POST', '/api/invoices', {})).status, 400);
  });

  test('saving creates the invoice with totals calculated on the server', async () => {
    // The client's own "totals" are ignored: 4*1500 + 2*1500 = 9000, +18% GST = 10620.
    const response = await owner.call('POST', '/api/invoices', {
      draft: { ...draft(), totals: { grandTotal: 1 } },
      event: 'save',
    });
    assert.equal(response.status, 201);
    assert.equal(response.data.created, true);
    const { invoice } = response.data;
    assert.deepEqual(invoice.totals, { taxableAmount: 9000, totalTax: 1620, grandTotal: 10620 });
    assert.equal(invoice.status, 'unpaid');
    assert.equal(invoice.pdfCount, 0);
    assert.equal(invoice.buyerName, 'OAKLEAF BATH STUDIO');
    assert.equal(invoice.invoiceDate, '2026-09-25T00:00:00.000Z');
  });

  test('saving remembers the seller profile and the buyer', async () => {
    const { profile } = (await owner.call('GET', '/api/profile')).data;
    assert.equal(profile.company.name, 'UNIQOO INDUSTRIES');
    assert.equal(profile.bank.ifsc, 'HDFC0000307');
    assert.deepEqual(profile.terms, ['Goods once sold will not be taken back.']);
    assert.equal('items' in profile, false);

    const { customers } = (await owner.call('GET', '/api/customers')).data;
    assert.equal(customers.length, 1);
    assert.equal(customers[0].details.name, 'OAKLEAF BATH STUDIO');
    assert.equal(customers[0].details.gstin, '24AAKFO3669D1Z7');
  });

  test('saving the same number again updates it and keeps status and PDF history', async () => {
    const { id } = (await owner.call('GET', '/api/invoices')).data.invoices[0];
    await owner.call('PATCH', `/api/invoices/${id}/status`, { status: 'paid' });

    const items = [{ name: 'PLANET-1048', hsn: '69101000', qty: '10', rate: '1000' }];
    const response = await owner.call('POST', '/api/invoices', { draft: draft({ items }), event: 'pdf' });
    assert.equal(response.status, 200);
    assert.equal(response.data.created, false);
    assert.equal(response.data.invoice.id, id);
    assert.equal(response.data.invoice.totals.grandTotal, 11800);
    assert.equal(response.data.invoice.status, 'paid');
    assert.equal(response.data.invoice.pdfCount, 1);
    assert.ok(response.data.invoice.lastPdfAt);
    assert.equal((await owner.call('GET', '/api/invoices')).data.total, 1);
  });

  test('a later invoice does not overwrite seller details that were edited', async () => {
    await owner.call('PUT', '/api/profile', { company: { name: 'RENAMED LLP' }, bank: {}, terms: [], jurisdiction: '' });
    await owner.call('POST', '/api/invoices', { draft: draft({ invoiceNo: 'UI/002/26-27' }) });
    assert.equal((await owner.call('GET', '/api/profile')).data.profile.company.name, 'RENAMED LLP');
  });

  test('a cash memo starts as paid', async () => {
    const response = await owner.call('POST', '/api/invoices', {
      draft: draft({ invoiceNo: 'UI/003/26-27', memoType: 'Cash Memo', buyer: party('WALK-IN', { gstin: '' }) }),
    });
    assert.equal(response.data.invoice.status, 'paid');
  });

  test('suggests the next number from the latest invoice', async () => {
    assert.equal((await owner.call('GET', '/api/invoices/next-number')).data.invoiceNo, 'UI/004/26-27');
  });

  test('history search, filters and paging', async () => {
    const list = async (query) => (await owner.call('GET', `/api/invoices?${query}`)).data;
    assert.equal((await list('')).total, 3);
    assert.equal((await list('q=oakleaf')).total, 2);
    assert.equal((await list('q=UI/003')).total, 1);
    assert.equal((await list('status=paid')).total, 2);
    assert.equal((await list('from=2026-09-26')).total, 0);
    assert.equal((await list('from=2026-09-25&to=2026-09-25')).total, 3);
    const paged = await list('limit=2&page=2');
    assert.equal(paged.invoices.length, 1);
    assert.equal(paged.pages, 2);
    // Regex characters in a search are plain text, never an error or a pattern.
    assert.equal((await list('q=' + encodeURIComponent('(.*'))).total, 0);
    assert.equal((await owner.call('GET', '/api/invoices?status=bogus')).status, 400);
    assert.equal((await owner.call('GET', '/api/invoices?from=yesterday')).status, 400);
  });

  test('one invoice comes back with its full draft, ready to reopen', async () => {
    const { id } = (await owner.call('GET', '/api/invoices?q=UI/003')).data.invoices[0];
    const { invoice } = (await owner.call('GET', `/api/invoices/${id}`)).data;
    assert.equal(invoice.draft.invoiceNo, 'UI/003/26-27');
    assert.equal(invoice.draft.buyer.name, 'WALK-IN');
    assert.equal(invoice.draft.items[0].name, 'PLANET-1048');
  });

  test('status can be changed back and PDF downloads are counted', async () => {
    const { id } = (await owner.call('GET', '/api/invoices?q=UI/003')).data.invoices[0];
    const unpaid = await owner.call('PATCH', `/api/invoices/${id}/status`, { status: 'unpaid' });
    assert.equal(unpaid.data.invoice.status, 'unpaid');
    assert.equal(unpaid.data.invoice.paidAt, null);
    assert.equal((await owner.call('PATCH', `/api/invoices/${id}/status`, { status: 'x' })).status, 400);
    const pdf = await owner.call('POST', `/api/invoices/${id}/pdf`);
    assert.equal(pdf.data.invoice.pdfCount, 1);
  });

  test('CSV export has the filtered rows and defuses spreadsheet formulas', async () => {
    await owner.call('POST', '/api/invoices', {
      draft: draft({ invoiceNo: 'UI/010/26-27', buyer: party('=HYPERLINK("http://evil")', { gstin: '' }) }),
    });
    const response = await owner.call('GET', '/api/invoices/export.csv?q=UI/010');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/csv/);
    assert.match(response.headers.get('content-disposition'), /attachment/);
    const lines = response.data.replace('﻿', '').trim().split('\r\n');
    assert.equal(lines.length, 2);
    assert.match(lines[0], /^Invoice No,Date,/);
    assert.match(lines[1], /^UI\/010\/26-27,25\/09\/2026,/);
    assert.ok(lines[1].includes(`"'=HYPERLINK(""http://evil"")"`), lines[1]);
  });

  test('one account can never see or change another account\'s data', async () => {
    const { id } = (await owner.call('GET', '/api/invoices')).data.invoices[0];
    assert.equal((await stranger.call('GET', `/api/invoices/${id}`)).status, 404);
    assert.equal((await stranger.call('PATCH', `/api/invoices/${id}/status`, { status: 'paid' })).status, 404);
    assert.equal((await stranger.call('POST', `/api/invoices/${id}/pdf`)).status, 404);
    assert.equal((await stranger.call('DELETE', `/api/invoices/${id}`)).status, 404);
    assert.equal((await stranger.call('GET', '/api/invoices')).data.total, 0);
    assert.equal((await stranger.call('GET', '/api/customers')).data.customers.length, 0);
    assert.equal((await stranger.call('GET', '/api/profile')).data.profile, null);
    assert.equal((await stranger.call('GET', '/api/stats')).data.totals.invoices, 0);
    // The same invoice number is free for another account.
    assert.equal((await stranger.call('POST', '/api/invoices', { draft: draft() })).status, 201);
    assert.equal((await owner.call('GET', `/api/invoices/not-an-id`)).status, 404);
  });

  test('stats add up', async () => {
    const stats = (await owner.call('GET', '/api/stats')).data;
    // 002 and 003 are 10620 each (9000 + 18%), 001 was updated to 11800, 010 is 10620.
    assert.equal(stats.totals.invoices, 4);
    assert.equal(stats.totals.sales, 11800 + 10620 * 3);
    assert.equal(stats.totals.gst, 1800 + 1620 * 3);
    assert.equal(stats.totals.paidAmount, 11800);
    assert.equal(stats.totals.unpaidCount, 3);
    assert.equal(stats.totals.unpaidAmount, 10620 * 3);
    assert.equal(stats.totals.customers, 3);
    assert.equal(stats.totals.averageInvoice, (11800 + 10620 * 3) / 4);
    assert.equal(stats.topCustomers[0].name, 'OAKLEAF BATH STUDIO');
    assert.equal(stats.topCustomers[0].invoices, 2);
    assert.equal(stats.topItems[0].name, 'PLANET-1048');
    assert.equal(stats.monthly.length, 12);
    assert.equal(stats.recent.length, 4);

    const none = (await owner.call('GET', '/api/stats?from=2030-01-01')).data;
    assert.equal(none.totals.invoices, 0);
    assert.equal(none.totals.averageInvoice, 0);
    assert.deepEqual(none.topCustomers, []);
  });

  test('deleting removes the invoice; saved buyers can be deleted too', async () => {
    const { id } = (await owner.call('GET', '/api/invoices?q=UI/010')).data.invoices[0];
    assert.equal((await owner.call('DELETE', `/api/invoices/${id}`)).status, 200);
    assert.equal((await owner.call('GET', `/api/invoices/${id}`)).status, 404);
    assert.equal((await owner.call('GET', '/api/invoices')).data.total, 3);

    const [customer] = (await owner.call('GET', '/api/customers')).data.customers;
    assert.equal((await owner.call('DELETE', `/api/customers/${customer.id}`)).status, 200);
    assert.equal((await owner.call('DELETE', `/api/customers/${customer.id}`)).status, 404);
  });
});
