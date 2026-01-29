

# Fix Test Advisor Visibility in RFP Wizard

## Problem Diagnosis

After investigating the database and code, I found **two issues**:

### Issue 1: No RFP Was Actually Sent

```text
Database Query Result:
┌─────────────────────────────────────────┬───────────────┐
│ Test Advisor                            │ Invite Count  │
├─────────────────────────────────────────┼───────────────┤
│ TEST_ONLY__Vendor Consulting Ltd        │ 0             │
└─────────────────────────────────────────┴───────────────┘
```

The `rfp_invites` table shows **zero invitations** sent to the test advisor. The RFP was never actually created in the database.

### Issue 2: Project Type Mismatch

The test project has type `"מגורים"` but the phase mappings in `advisorPhases.ts` only cover:
- `'תמ"א 38 - פינוי ובינוי'`
- `'פינוי־בינוי (מתחמים)'`
- `'תמ"א 38/1 – חיזוק ותוספות'`
- `'תמ"א 38/2 – הריסה ובנייה מחדש'`

The test expertise `'יועץ בדיקות (TEST)'` is **NOT mapped** for the `"מגורים"` project type.

---

## Solution

### Option A: Add Phase Mapping for "מגורים" Project Type (Recommended)

Add the test expertise to a new `"מגורים"` phase mapping in `advisorPhases.ts`:

```typescript
// Add new mapping for מגורים project type
'מגורים': {
  'אדריכל': 1,
  'עורך דין מקרקעין': 1,
  'יועץ בדיקות (TEST)': 1,
  // ... other advisors
},
'מגורים בבנייה רוויה (5–8 קומות)': {
  'אדריכל': 1,
  'עורך דין מקרקעין': 1,
  'יועץ בדיקות (TEST)': 1,
  // ... other advisors
}
```

### Option B: Update Test Project Type

Change the test project's type in the database to match one of the existing mappings:

```sql
UPDATE public.projects 
SET type = 'תמ"א 38 - פינוי ובינוי'
WHERE name LIKE 'TEST_ONLY__%';
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/constants/advisorPhases.ts` | Add phase mappings for `מגורים` and `מגורים בבנייה רוויה (5–8 קומות)` project types |

---

## What Happens After the Fix

1. Entrepreneur opens RFP wizard for the test project
2. Wizard loads advisor list from JSON (includes `יועץ בדיקות (TEST)` in `required_categories`)
3. `getAdvisorPhase()` finds the mapping for the project type `מגורים`
4. Test expertise appears in Phase 1 ("Must Have") section
5. Entrepreneur selects the test advisor and sends RFP
6. `rfp_invites` record is created
7. Test advisor sees the RFP on their dashboard

---

## Technical Details

### Current Phase Mapping Flow

```text
projectType = "מגורים"
         │
         ▼
getAdvisorPhase("מגורים", "יועץ בדיקות (TEST)")
         │
         ▼
ADVISOR_PHASES_BY_PROJECT_TYPE["מגורים"] → undefined ❌
         │
         ▼
normalizeLegacyProjectType("מגורים") → "מגורים בבנייה רוויה (5–8 קומות)"
         │
         ▼
ADVISOR_PHASES_BY_PROJECT_TYPE["מגורים בבנייה רוויה..."] → undefined ❌
         │
         ▼
Phase = undefined → Falls to "Optional" section (or not shown)
```

### After Fix

```text
projectType = "מגורים"
         │
         ▼
ADVISOR_PHASES_BY_PROJECT_TYPE["מגורים"] → { 'יועץ בדיקות (TEST)': 1 } ✅
         │
         ▼
Phase = 1 → Appears in Phase 1 "Must Have" section
```

