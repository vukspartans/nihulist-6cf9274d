

# Add Test-Only Expertise Type for Isolated Testing

## The Problem
When sending an RFP, the system shows ALL active, approved advisors with matching expertise. Currently there are 6 advisors with `אדריכל` expertise, so selecting that type would show all 6 - not just your test advisor.

## The Solution
Add a unique expertise type that ONLY the test advisor will have. This ensures RFPs sent for this expertise will only go to the test advisor.

---

## Implementation Steps

### Step 1: Add Test Expertise to Constants
**File:** `src/constants/advisor.ts`

Add a new expertise type at the end of the list:
```
'יועץ בדיקות (TEST)'
```

Also add it to a new test category in `ADVISOR_EXPERTISE_CATEGORIES`:
```
'בדיקות': [
  'יועץ בדיקות (TEST)'
]
```

### Step 2: Update Test Advisor in Database
Run this SQL in Supabase SQL Editor to set the test advisor's expertise:

```sql
UPDATE public.advisors 
SET 
    expertise = ARRAY['יועץ בדיקות (TEST)'],
    admin_approved = true,
    is_active = true
WHERE company_name LIKE 'TEST_ONLY__%';
```

---

## How It Will Work

```text
+------------------+     +-------------------+     +------------------+
|  Entrepreneur    |     |   RFP Wizard      |     |  Test Advisor    |
|  selects         | --> |   shows only      | --> |  receives RFP    |
|  'יועץ בדיקות    |     |   advisors with   |     |  notification    |
|   (TEST)'        |     |   this expertise  |     |                  |
+------------------+     +-------------------+     +------------------+
                                  |
                                  v
                         Only TEST_ONLY__ advisor
                         has this expertise!
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/constants/advisor.ts` | Add `'יועץ בדיקות (TEST)'` to `ADVISOR_EXPERTISE` array and create new `'בדיקות'` category |

## Database Update (via SQL Editor)

Update test advisor expertise to match the new constant.

---

## Benefits

- **Complete isolation**: Only the test advisor has this expertise
- **No impact on production**: Real advisors are unaffected
- **Clear labeling**: The `(TEST)` suffix makes it obvious this is for testing
- **Easily reversible**: Just remove the constant and update the advisor

---

## Technical Details

### Advisor Matching Logic
The system uses this flow (from `useAdvisorsByExpertise.ts`):
1. Query advisors where `is_active = true` AND `admin_approved = true`
2. Filter by `expertise` array containing the selected type
3. Since only test advisor has `'יועץ בדיקות (TEST)'`, only they will appear

### Where Test Expertise Will Appear
- RFP Wizard advisor type selection
- Admin panel template management
- Advisor profile expertise selection

