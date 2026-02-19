

# Fix: Advisors with Legacy Expertise Names Missing from Distribution Lists

## Problem

The system defines the canonical advisor type as "אדריכל נוף ופיתוח" (Landscape Architect & Development), but most advisors in the database were registered with older names:

| Expertise in DB | Count | Found by system? |
|---|---|---|
| אדריכל נוף ופיתוח | 2 | Yes |
| אדריכל נוף | 5 | No |
| יועץ פיתוח | 2 | No |
| יועץ אשפה (legacy for יועץ תברואה) | 1 | No |

The matching logic in `useAdvisorsByExpertise.ts` uses exact string matching (`expertise.includes(type)`), so legacy names are invisible.

## Solution

Two-part fix to handle this both in the frontend matching and in the database itself:

### Part 1: Use Canonicalization in Matching (immediate fix)

In `src/hooks/useAdvisorsByExpertise.ts`, update the advisor-to-type matching to use `canonicalizeAdvisor()` so that legacy names are mapped to their canonical equivalents.

**Current code (line 112-115):**
```typescript
selectedAdvisorTypes.forEach(type => {
  const matchingAdvisors = advisors.filter(advisor => 
    advisor.expertise?.includes(type)
  );
```

**Updated code:**
```typescript
import { canonicalizeAdvisor } from '@/lib/canonicalizeAdvisor';

selectedAdvisorTypes.forEach(type => {
  const canonicalType = canonicalizeAdvisor(type);
  const matchingAdvisors = advisors.filter(advisor =>
    advisor.expertise?.some(exp => canonicalizeAdvisor(exp) === canonicalType)
  );
```

This ensures that "אדריכל נוף" and "יועץ פיתוח" both resolve to "אדריכל נוף ופיתוח" when matching.

### Part 2: Normalize Legacy Data in Database (one-time migration)

Create a migration that updates existing advisor records to use canonical names, so future exact-match queries also work correctly.

**New migration file:**
```sql
-- Normalize "אדריכל נוף" -> "אדריכל נוף ופיתוח"
UPDATE advisors
SET expertise = array_replace(expertise, 'אדריכל נוף', 'אדריכל נוף ופיתוח')
WHERE 'אדריכל נוף' = ANY(expertise);

-- Normalize "יועץ פיתוח" -> "אדריכל נוף ופיתוח"  
UPDATE advisors
SET expertise = array_replace(expertise, 'יועץ פיתוח', 'אדריכל נוף ופיתוח')
WHERE 'יועץ פיתוח' = ANY(expertise);

-- Normalize "יועץ אשפה" -> "יועץ תברואה"
UPDATE advisors
SET expertise = array_replace(expertise, 'יועץ אשפה', 'יועץ תברואה')
WHERE 'יועץ אשפה' = ANY(expertise);

-- Remove duplicates that may result from replacements
UPDATE advisors
SET expertise = (
  SELECT array_agg(DISTINCT e)
  FROM unnest(expertise) AS e
)
WHERE array_length(expertise, 1) > 0;
```

### Part 3: Protect Against Future Legacy Names in Bulk Upload

In the bulk advisor upload edge function, apply canonicalization to expertise values before inserting.

**File: `supabase/functions/bulk-create-advisors/index.ts`** -- apply `canonicalizeAdvisor` equivalent logic to each expertise string during import.

## Files to Create/Modify

| File | Change |
|---|---|
| `src/hooks/useAdvisorsByExpertise.ts` | Use `canonicalizeAdvisor()` in expertise matching |
| `supabase/migrations/[new]_normalize_advisor_expertise.sql` | One-time data normalization |
| `supabase/functions/bulk-create-advisors/index.ts` | Canonicalize expertise on import |

## Impact

After this fix, all 8 landscape/development advisors (and any with other legacy names) will correctly appear in distribution lists and RFP invitations.

