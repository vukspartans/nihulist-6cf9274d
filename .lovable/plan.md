
# Add Test Advisor Expertise to RFP Wizard

## Summary
Add `יועץ בדיקות (TEST)` to appear in the RFP wizard advisor selection list by updating two configuration sources:
1. **Supabase Storage JSON** - Add to `required_categories` so it appears for all project types
2. **Phase Mapping** - Add to `advisorPhases.ts` so it appears in a proper phase section (not "optional")

---

## Current Data Flow

```text
+------------------------+      +----------------------+      +-------------------------+
| Supabase Storage       |      | Edge Function        |      | PhasedAdvisorSelection  |
| json/advisors_         | ---> | get-advisors-data    | ---> | Component               |
| projects_full.json     |      |                      |      |                         |
+------------------------+      +----------------------+      +-------------------------+
         |                                                              |
         v                                                              v
  required_categories[]  ----+                              displayedAdvisors = union of:
  projects[].Advisors    ----+---> Combined advisor list    - required_categories
                                                            - project-specific advisors
                                                                        |
                                                                        v
                                                            getAdvisorPhase() assigns phase
                                                            - Phase 1/2/3 = shown in phase
                                                            - undefined = "Optional" section
```

---

## Changes Required

### 1. Update Supabase Storage JSON

**File:** `json/advisors_projects_full.json` in Supabase Storage bucket

**Action:** Add `יועץ בדיקות (TEST)` to the `required_categories` array

This ensures the test advisor expertise appears in the global list for ALL project types.

**Manual step required:** Update the JSON file in Supabase Storage:
- Go to Supabase Dashboard > Storage > `json` bucket
- Download `advisors_projects_full.json`
- Add `"יועץ בדיקות (TEST)"` to the `required_categories` array
- Upload the modified file back

---

### 2. Update Phase Mapping

**File:** `src/constants/advisorPhases.ts`

**Action:** Add `'יועץ בדיקות (TEST)': 1` to ALL project type mappings in `ADVISOR_PHASES_BY_PROJECT_TYPE`

This ensures the test advisor appears in Phase 1 ("Must Have") section rather than the "Optional" section at the bottom.

**Code change:**
```typescript
// Add to each project type mapping:
'יועץ בדיקות (TEST)': 1,
```

Project types to update:
- `'תמ"א 38 - פינוי ובינוי'`
- `'פינוי־בינוי (מתחמים)'`
- `'תמ"א 38/1 – חיזוק ותוספות'`
- `'תמ"א 38/2 – הריסה ובנייה מחדש'`

---

## Why Phase 1?

Phase 1 is the "Must Have" phase that is expanded by default (`openPhases` defaults to `{ 1: true }`). Placing the test advisor here ensures maximum visibility during testing.

---

## Testing Checklist

After implementation:
- [ ] Navigate to RFP wizard
- [ ] Select any project type (e.g., תמ"א 38)
- [ ] Verify `יועץ בדיקות (TEST)` appears in Phase 1 section
- [ ] Select the test advisor
- [ ] Confirm only TEST_ONLY__ advisor appears in recommendations

---

## Files Modified

| File | Change |
|------|--------|
| `src/constants/advisorPhases.ts` | Add phase mapping for test expertise to all project types |
| `json/advisors_projects_full.json` (Supabase Storage) | Add to `required_categories` array (manual) |

---

## Note on Cache

The `useAdvisorsValidation` hook caches data for 30 minutes. After updating the JSON file, either:
- Wait 30 minutes, OR
- Clear localStorage key `advisors-data-cache`, OR  
- Increment `CACHE_VERSION` in `useAdvisorsValidation.ts` (not recommended for this change)
