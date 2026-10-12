import { isBlankParty, toPrintableInvoice } from './invoiceModel.js';

/*
 * The invoice being edited is kept in this browser so a refresh does not lose it. It is
 * stored per account, so two people sharing a computer never see each other's work.
 * History and the seller profile live on the server; this is only the working copy.
 */
const draftKey = (userId) => `billing-pdf:draft:v2:${userId}`;
const savedKey = (userId) => `billing-pdf:saved:v2:${userId}`;
// Before accounts existed the draft had a single shared key.
const LEGACY_KEY = 'billing-pdf:draft:v1';

// Same content gives the same text, whatever order the keys came in (the server's copy of a
// draft is ordered differently from the form's).
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

const signatureOf = (draft) => JSON.stringify(canonical(draft));

function readDraft(key, fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    const looksValid =
      saved && typeof saved === 'object' && Array.isArray(saved.items) && saved.company && saved.buyer;
    return looksValid ? { ...fallback, ...saved } : null;
  } catch {
    return null;
  }
}

/**
 * This account's saved form draft, or null when there is none. `fallback` supplies any
 * field an older draft lacks. The first account to log in on a browser that still holds a
 * pre-accounts draft takes it over, so nothing typed before is lost.
 */
export function loadDraft(userId, fallback) {
  const own = readDraft(draftKey(userId), fallback);
  if (own) return own;

  const legacy = readDraft(LEGACY_KEY, fallback);
  if (!legacy) return null;
  saveDraft(userId, legacy);
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // Blocked storage: the draft just stays where it was.
  }
  return legacy;
}

export function saveDraft(userId, draft) {
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    // Storage full or blocked (private mode): the form still works, it just isn't kept.
  }
}

export function clearDraft(userId) {
  try {
    localStorage.removeItem(draftKey(userId));
    localStorage.removeItem(savedKey(userId));
  } catch {
    // Nothing to clear if storage is blocked.
  }
}

/** Remembers that `draft` is what is now in the server's history. */
export function markSaved(userId, draft) {
  try {
    localStorage.setItem(savedKey(userId), signatureOf(draft));
  } catch {
    // Without this the app only asks about unsaved work more often than needed.
  }
}

/** True when the draft has a buyer or items and differs from what was last saved to history. */
export function hasUnsavedWork(userId) {
  try {
    const draft = readDraft(draftKey(userId), {});
    if (!draft) return false;
    const hasContent = !isBlankParty(draft.buyer) || toPrintableInvoice(draft).items.length > 0;
    return hasContent && signatureOf(draft) !== localStorage.getItem(savedKey(userId));
  } catch {
    return false;
  }
}
