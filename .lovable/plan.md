

# Bug Fix: Prevent milestone percentages exceeding 100% in negotiation

## Problem
The entrepreneur can set milestone percentages that total more than 100% (e.g., 135% as shown in screenshot) when creating a negotiation request. The `MilestoneNegotiationTable` displays a warning but nothing prevents submission.

## Changes

### 1. `src/components/negotiation/NegotiationDialog.tsx` — Add validation in `handleSubmit`

Before calling `createNegotiationSession` (~line 386), add a check:

```typescript
// Validate milestone percentages sum to 100% if any adjustments were made
if (milestoneAdjustments.length > 0) {
  // Calculate effective total: adjusted milestones use target_percentage, others keep original
  const milestoneTotal = milestones.reduce((sum, m) => {
    const milestoneId = m.id || m.name;
    const adj = milestoneAdjustments.find(a => a.milestone_id === milestoneId);
    return sum + (adj ? adj.target_percentage : m.percentage);
  }, 0);
  
  if (Math.abs(milestoneTotal - 100) > 0.01) {
    toast({
      title: "שגיאה באבני דרך",
      description: `סה"כ אחוזי אבני הדרך חייב להיות 100%. כרגע: ${milestoneTotal.toFixed(1)}%`,
      variant: "destructive",
    });
    return;
  }
}
```

### 2. `src/components/negotiation/NegotiationDialog.tsx` — Disable submit button when invalid

Add a computed `isMilestoneInvalid` flag and use it to disable the submit button alongside the existing `loading || uploading` condition.

### 3. `supabase/functions/send-negotiation-request/index.ts` — Server-side validation

Add a server-side check for milestone_adjustments total before creating the session, returning a 400 error if percentages exceed 100%.

