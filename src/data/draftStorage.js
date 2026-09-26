const STORAGE_KEY = 'billing-pdf:draft:v1';

/** The saved form draft, or `fallback` when there is none (or storage is unavailable). */
export function loadDraft(fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const looksValid =
      saved && typeof saved === 'object' && Array.isArray(saved.items) && saved.company && saved.buyer;
    return looksValid ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

export function saveDraft(draft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Storage full or blocked (private mode): the form still works, it just isn't kept.
  }
}
