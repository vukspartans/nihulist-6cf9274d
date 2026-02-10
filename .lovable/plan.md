

# UX and Architecture Validation -- Final Review

## Status: 1 Critical Bug, 2 UX Issues Found

---

## Bug 1: `projectType` Not Passed to RequestEditorDialog (CRITICAL)

**Impact**: The category dropdown in the Services tab loads ALL categories for the advisor type, ignoring the project's type. This defeats the purpose of the admin's 5-level hierarchy (Advisor Type -> **Project Type** -> Category -> Method -> Items).

**Root Cause**: `AdvisorRecommendationsCard` renders `RequestEditorDialog` at line 183 but does NOT pass the `projectType` prop, even though:
- `AdvisorRecommendationsCard` receives `projectType` as a prop (line 15)
- `RequestEditorDialog` accepts `projectType` as a prop (line 39)
- `ServiceDetailsTab` uses it to filter categories via `useFeeTemplateCategories(advisorType, projectType)` (line 72-75)

**Fix**: Add `projectType={projectType}` to the `RequestEditorDialog` usage in `AdvisorRecommendationsCard.tsx` line 183-191.

---

## UX Issue 2: No Empty State Guidance When No Categories Exist

**Impact**: If an admin has not yet created any categories for a given advisor type + project type, the entrepreneur sees NO dropdown and NO explanation. The Services tab just shows an empty checklist with no context.

**Fix**: Add a subtle info message when `categories` is empty (after loading completes), telling the entrepreneur that templates are not yet configured for this type. Something like: "לא הוגדרו תבניות עבור סוג יועץ זה. ניתן להוסיף שירותים ידנית."

---

## UX Issue 3: Tab Labels Not Visible on Mobile

**Impact**: On small screens, all 4 tab labels (פירוט שירותים, שכר טרחה, תשלום, מידע וקבצים) are hidden via `hidden sm:inline` (lines 804-819 of RequestEditorDialog). Only icons are shown, which are not self-explanatory for Hebrew-speaking entrepreneurs unfamiliar with icon conventions.

**Fix**: Show abbreviated labels on mobile instead of hiding them entirely. For example: "שירותים", "שכ״ט", "תשלום", "קבצים".

---

## Implementation Plan

| # | Severity | File | Change |
|---|----------|------|--------|
| 1 | Critical | `AdvisorRecommendationsCard.tsx` | Add `projectType={projectType}` prop to `RequestEditorDialog` (line 186) |
| 2 | Low | `ServiceDetailsTab.tsx` | Add empty state message when no categories found after loading |
| 3 | Low | `RequestEditorDialog.tsx` | Replace `hidden sm:inline` with abbreviated mobile labels |

All three are small, isolated changes with no risk of regression.

