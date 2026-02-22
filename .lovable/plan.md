
# Fix: "Failed to load advisor data" - Add Error Logging and Graceful Handling

## Problem
The catch block at line 527 in `AdvisorDashboard.tsx` shows the toast "Failed to load advisor data" but never logs the actual error, making it impossible to diagnose the root cause. The session is valid and data exists in the database.

## Root Cause Candidates
The error is thrown somewhere in `fetchAdvisorData` but we cannot see what it is. Likely candidates:
- The `.single()` call on the `advisors` query (line 201-205) throws if no rows are found instead of returning null
- The `project_advisors!project_advisors_proposal_id_fkey` join in the proposals query (line 388) may fail if the FK relationship doesn't match expectations
- The `!inner` joins in the negotiation query (line 433) may cause errors for orphaned records

## Fix (3 changes in `src/pages/AdvisorDashboard.tsx`)

### 1. Log the actual error in the catch block (line 527-532)
Add `console.error` so we can see what's really failing:
```typescript
} catch (error) {
  console.error('[AdvisorDashboard] Fatal error loading data:', error);
  toast({
    title: "Error",
    description: "Failed to load advisor data",
    variant: "destructive",
  });
}
```

### 2. Use `.maybeSingle()` instead of `.single()` for advisor query (line 205)
The `.single()` method throws an error if zero or multiple rows are returned. Changing to `.maybeSingle()` returns null gracefully:
```typescript
// Line 205: Change .single() to .maybeSingle()
.maybeSingle();
```

### 3. Use `.maybeSingle()` for profile query too (line 192)
Same issue - prevents throwing on zero rows:
```typescript
// Line 192: Change .single() to .maybeSingle()
.maybeSingle();
```

## Impact
- The error toast will still show if there's a real problem, but now the console will reveal the actual error
- Users without an advisor record won't see a crash - they'll see an empty dashboard
- No UI changes
