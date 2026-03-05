

# Fix: Sticky Bottom Navigation in Proposal Submission

## Problem
On the SubmitProposal page, each tab's "next/back" navigation buttons are placed at the very bottom of the tab content. When a tab has long content (e.g., the fee table with many rows), the user must scroll all the way down just to proceed to the next step. The user correctly notes: "התנהגותית לא נכון לרדת עד לתחתית הדף כדי להתקדם" (behaviorally, it's wrong to require scrolling to the bottom to proceed).

## Solution
Add a **sticky bottom navigation bar** that stays fixed at the bottom of the viewport, containing the back/next buttons for the current tab. This replaces the per-tab inline navigation buttons.

### Changes

**File: `src/pages/SubmitProposal.tsx`**

1. **Remove the 6 inline navigation `<div>` blocks** at the bottom of each `TabsContent` (lines ~1169-1174, ~1245-1253, ~1284-1292, ~1333-1341, ~1369-1377, ~1447-1461).

2. **Add a sticky bottom bar outside the Tabs component** (but inside the form), rendered as:
```tsx
<div className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-sm border-t p-4 -mx-4 mt-6">
  <div className="flex justify-between items-center max-w-5xl mx-auto">
    {/* Back button — hidden on first tab */}
    {activeTab !== 'request' && (
      <Button type="button" variant="outline" onClick={() => setActiveTab(getPrevTab())} className="gap-2">
        <ArrowRight className="h-4 w-4" />
        חזרה
      </Button>
    )}
    <div className="flex-1" />
    {/* Next or Submit button */}
    {activeTab === 'signature' ? (
      <Button type="submit" size="lg" className="gap-2 font-bold" disabled={submitting}>
        <Send className="h-5 w-5" />
        {submitting ? "שולח..." : "הגש הצעת מחיר רשמית"}
      </Button>
    ) : (
      <Button type="button" onClick={() => setActiveTab(getNextTab())} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        {getNextTabLabel()}
      </Button>
    )}
  </div>
</div>
```

3. **Add helper functions** `getPrevTab()`, `getNextTab()`, and `getNextTabLabel()` that compute the correct tab based on `activeTab` and the conditional tabs (`hasServiceScope`, `hasPaymentTerms`). These replace the duplicated inline logic currently spread across 6 tab footers.

4. **Keep the submit footer info** (total price line at ~1464) inside the sticky bar when on the signature tab.

5. **Scroll to top on tab change**: Add a `useEffect` on `activeTab` that scrolls the container to the top, so users don't land mid-page when navigating between tabs.

### Result
- Navigation buttons are always visible without scrolling
- Consistent behavior across all tabs
- Submit button is prominent and accessible on the final tab
- Removes ~60 lines of duplicated inline navigation code

