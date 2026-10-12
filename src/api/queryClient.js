import { QueryClient } from '@tanstack/react-query';

const MINUTE = 60 * 1000;

/**
 * Remembers what the server sent, so moving between pages shows it straight away instead of
 * asking again.
 *
 * - For 5 minutes after it arrives, saved data is used as it is: no request at all.
 * - After that it is still shown at once, and refreshed quietly in the background when the
 *   page is opened again (or the tab is focused again).
 * - Anything this app changes (save, mark paid, delete) marks the affected data out of date
 *   right away, see queries.js, so the app never shows its own old numbers.
 * - A failed request is not retried on its own: the pages already say what went wrong.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * MINUTE,
      gcTime: 30 * MINUTE,
      retry: false,
    },
  },
});
