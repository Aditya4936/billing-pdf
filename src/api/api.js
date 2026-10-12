/** An error from the server whose message is written for the user to read. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let onSessionExpired = () => {};

/** Called when a request that needs a login comes back 401. AuthProvider sets this. */
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

async function request(method, url, body, { quiet401 = false } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401 && !quiet401) onSessionExpired();
    throw new ApiError(data?.error ?? `Something went wrong (error ${response.status}).`, response.status);
  }
  return data;
}

const get = (url, options) => request('GET', url, undefined, options);
const post = (url, body, options) => request('POST', url, body ?? {}, options);

/** Query string from an object, leaving out empty values. */
function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const api = {
  auth: {
    // 401 here means "not logged in" or "wrong password", not "session expired".
    me: () => get('/api/auth/me', { quiet401: true }),
    login: (credentials) => post('/api/auth/login', credentials, { quiet401: true }),
    register: (details) => post('/api/auth/register', details, { quiet401: true }),
    logout: () => post('/api/auth/logout', {}, { quiet401: true }),
  },
  profile: {
    get: () => get('/api/profile'),
    save: (seller) => request('PUT', '/api/profile', seller),
  },
  customers: {
    list: () => get('/api/customers'),
    remove: (id) => request('DELETE', `/api/customers/${id}`),
  },
  invoices: {
    list: (params) => get(`/api/invoices${query(params)}`),
    get: (id) => get(`/api/invoices/${id}`),
    nextNumber: () => get('/api/invoices/next-number'),
    /** Saves (or updates) an invoice. `event`: 'save' | 'pdf' | 'print'. */
    save: (draft, event = 'save') => post('/api/invoices', { draft, event }),
    setStatus: (id, status) => request('PATCH', `/api/invoices/${id}/status`, { status }),
    recordPdf: (id) => post(`/api/invoices/${id}/pdf`),
    remove: (id) => request('DELETE', `/api/invoices/${id}`),
    /** URL of the CSV download for the same filters as the list. */
    csvUrl: (params) => `/api/invoices/export.csv${query(params)}`,
  },
  stats: {
    get: (params) => get(`/api/stats${query(params)}`),
  },
};
