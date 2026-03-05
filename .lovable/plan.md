

# Fix: Negotiation Action Buttons UX (Advisor Side)

## Problem

On the advisor's negotiation response view, there are 3 action buttons in one row:
- **דחה בקשה** (Decline) — red
- **קבל מחיר יעד** (Accept target price) — green outline  
- **הגש הצעת מחיר מעודכנת** (Submit updated offer) — blue

The issues (from the screenshot notes):
1. "קבל מחיר יעד" should be renamed to **"קבל בקשת יזם"** (Accept entrepreneur's request) — clearer intent
2. It should be **visually separated** from the other two buttons — currently all 3 are grouped together which is confusing since "accept target" and "submit counter-offer" are fundamentally different actions
3. After clicking accept, the confirmation dialog should show a **proper summary** of what the advisor is agreeing to (line items, totals, percentage change) so the advisor fully understands the commitment

## Changes

**File: `src/components/negotiation/NegotiationResponseView.tsx`**

### 1. Rename button
Change "קבל מחיר יעד" → "קבל בקשת יזם"

### 2. Separate the accept button visually
Split the 3-button row into two sections:
- **Top**: A prominent card/banner with "קבל בקשת יזם" — this is the "quick accept" path, shown with a green background, price summary inline, making it clear this accepts everything the entrepreneur asked for
- **Bottom**: The existing row with "דחה בקשה" and "הגש הצעת מחיר מעודכנת" — these are the "negotiate further" options

### 3. Improve the confirmation dialog (`showAcceptDialog`)
Currently shows just the target total and a warning. Enhance to include:
- Original price vs. target price comparison
- List of changed items (count of modified, removed items)
- Percentage reduction
- Clear statement: "אתה מאשר את כל השינויים שביקש היזם" (You are approving all changes the entrepreneur requested)

Also update the entrepreneur-side dialog label: in `EntrepreneurNegotiationView.tsx`, rename "קבל הצעה נגדית" to be consistent.

### Files
| File | Change |
|------|--------|
| `src/components/negotiation/NegotiationResponseView.tsx` | Rename button, separate layout, enhance confirmation dialog |
| `src/components/negotiation/EntrepreneurNegotiationView.tsx` | Minor label consistency |

