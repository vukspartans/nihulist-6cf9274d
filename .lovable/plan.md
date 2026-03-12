

# Fix: Reset `hasManualEdits` on Session Change

## Problem
`hasManualEdits` is set to `false` only on initial mount. If the `sessionId` prop changes (different offer) or the session reloads, the flag retains its previous value, potentially causing incorrect behavior on a different offer.

## Fix

In `src/components/negotiation/NegotiationResponseView.tsx`, add `setHasManualEdits(false)` at the top of the `loadSession` function (around line 112, right after `setLoadingSession(true)`). This ensures the flag resets every time a new session is loaded — whether from a prop change, a page refresh, or a manual reload.

**One line added, one file changed.**

