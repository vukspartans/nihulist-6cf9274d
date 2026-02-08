
# Bug Validation & Action Plan: Proposal Approval, Dashboard Notifications, and Counter-Offer Visibility

## Summary of Reported Bugs

The customer reported three distinct issues:

1. **Proposal Approval Screen Bug**: After approving a proposal, the screen doesn't close and status doesn't update
2. **Dashboard Notifications Bug**: No notification when new proposals arrive; projects with new proposals aren't prioritized
3. **Counter-Proposal Visibility Bug**: Counter-proposals from advisors aren't appearing

---

## Bug 1: Proposal Approval Screen Not Closing / Status Not Updating

### Validation: PARTIALLY VALID

**Current Code Analysis:**

The code in `ProposalApprovalDialog.tsx` (lines 159-169) already handles closing the dialog and calling `onSuccess`:

```typescript
if (result.success) {
  onOpenChange(false);     // ← Should close the dialog
  onSuccess?.();           // ← Should refresh parent data
  // Reset state...
}
```

The `useProposalApproval.ts` hook (lines 120-123) invalidates caches:

```typescript
queryClient.invalidateQueries({ queryKey: ['proposals', data.projectId] });
queryClient.invalidateQueries({ queryKey: ['project-advisors', data.projectId] });
queryClient.invalidateQueries({ queryKey: ['activity-log', data.projectId] });
```

**Root Cause Analysis:**

The issue is in how the dialogs are nested and how `onSuccess` is passed:

| Location | onSuccess Handler |
|----------|-------------------|
| `ProposalDetailDialog.tsx` (line 1200) | `onSuccess={()=>{ onStatusChange?.(); onSuccess?.(); onOpenChange(false); }}` ✅ Properly chains callbacks AND closes parent |
| `ProposalComparisonDialog.tsx` (line 1188) | `onSuccess={fetchProposals}` ⚠️ Only fetches, doesn't close comparison dialog |

**Issue Found:**
- In `ProposalComparisonDialog`, when approving from the comparison view, the approval dialog closes but the comparison dialog stays open with stale data
- The `fetchProposals` call should trigger a React Query refetch, but there may be a timing issue

**Proposed Fix:**
1. Modify `ProposalComparisonDialog` to properly close after approval
2. Add explicit state reset for `selectedProposal` after approval
3. Add optimistic UI update or force refetch with `await`

---

## Bug 2: Dashboard Notifications for New Proposals

### Validation: VALID

**Current State Analysis:**

1. **Email Notifications**: The `notify-proposal-submitted` edge function (lines 139-145) sends emails to entrepreneurs when proposals are submitted - this works correctly.

2. **In-App Notifications**: 
   - `NotificationsDropdown.tsx` exists but is ONLY used in `AdvisorDashboard.tsx` (line 804)
   - The entrepreneur's `Dashboard.tsx` has **NO** notifications dropdown in the header (line 317 only shows `<UserHeader />`)

3. **Project Prioritization**: 
   - The code at `Dashboard.tsx` lines 240-246 DOES prioritize projects with unseen proposals:
   
   ```typescript
   // Priority 1: Projects with unseen proposals come first
   const aHasUnseen = (unseenProposalCounts[a.id] || 0) > 0;
   const bHasUnseen = (unseenProposalCounts[b.id] || 0) > 0;
   if (aHasUnseen !== bHasUnseen) {
     return aHasUnseen ? -1 : 1; // Unseen first
   }
   ```
   
   - **BUT** the `fetchUnseenProposalCounts` function (lines 178-208) has a **24-hour filter**:
   
   ```typescript
   const twentyFourHoursAgo = new Date();
   twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
   // ...
   .gte('submitted_at', twentyFourHoursAgo.toISOString()); // ← Only last 24 hours!
   ```

**Issues Found:**
1. **Missing Notifications Bell**: Entrepreneur dashboard doesn't have in-app notifications
2. **24-Hour Limit**: Projects with proposals older than 24 hours won't be prioritized even if unseen
3. **No Real-time Updates**: Dashboard doesn't subscribe to real-time changes

**Proposed Fixes:**
1. Add `NotificationsDropdown` to entrepreneur `Dashboard.tsx` header
2. Remove or extend the 24-hour filter in `fetchUnseenProposalCounts`
3. Create a real-time subscription for new proposals (optional enhancement)
4. Add a dedicated "New Proposals" section or alert banner

---

## Bug 3: Counter-Proposals Not Appearing

### Validation: VALID

**Current State Analysis:**

Counter-proposals (status: `resubmitted`) should appear in the proposals list. The query in `ProjectDetail.tsx` (lines 130-178) fetches ALL proposals including resubmitted ones.

**Potential Causes:**

1. **Status Check Issue**: The unseen proposal count in Dashboard only counts `status: 'submitted'` proposals:
   
   ```typescript
   .eq('status', 'submitted')  // ← Doesn't include 'resubmitted'!
   ```
   
   Counter-offers have status `resubmitted`, so they're excluded from the count!

2. **Notification Gap**: The `notify-proposal-submitted` function is called on initial submission, but there's no equivalent for resubmissions/counter-offers.

3. **Real-time Subscription**: No real-time listener for proposal status changes.

**Issue Found:**
The `fetchUnseenProposalCounts` function in `Dashboard.tsx` line 189 explicitly filters to only `status: 'submitted'`, excluding `resubmitted` counter-offers.

**Proposed Fix:**
1. Update the query to include both `submitted` and `resubmitted` statuses:
   ```typescript
   .in('status', ['submitted', 'resubmitted'])
   ```
2. Create a notification for resubmitted proposals (either email or in-app)

---

## Summary of Root Causes

| Bug | Root Cause | Severity |
|-----|------------|----------|
| Approval screen not closing | `ProposalComparisonDialog` doesn't reset state after approval | Medium |
| Status not updating | Cache invalidation might have timing issue | Medium |
| No notification bell | `NotificationsDropdown` not added to entrepreneur dashboard | High |
| 24-hour limit on prioritization | Filter excludes older unseen proposals | Medium |
| Counter-proposals not appearing | Query filters by `status: 'submitted'` only, excludes `resubmitted` | High |

---

## Implementation Plan

### Phase 1: Fix Counter-Proposal Visibility (High Priority)

**File: `src/pages/Dashboard.tsx`**

Change line 189:
```typescript
// FROM:
.eq('status', 'submitted')

// TO:
.in('status', ['submitted', 'resubmitted'])
```

This ensures counter-offers are counted in the unseen proposal badges.

### Phase 2: Add Notifications to Entrepreneur Dashboard (High Priority)

**File: `src/pages/Dashboard.tsx`**

1. Add state for tracking new proposals:
```typescript
const [newProposalNotifications, setNewProposalNotifications] = useState<NotificationItem[]>([]);
```

2. Fetch notifications based on unseen proposals:
```typescript
const fetchProposalNotifications = async (projectIds: string[]) => {
  const { data } = await supabase
    .from('proposals')
    .select('id, project_id, supplier_name, submitted_at')
    .in('project_id', projectIds)
    .is('seen_by_entrepreneur_at', null)
    .in('status', ['submitted', 'resubmitted'])
    .order('submitted_at', { ascending: false })
    .limit(10);
  
  // Map to notification format...
};
```

3. Add `NotificationsDropdown` to header (line 306-317):
```tsx
<div className="flex items-center gap-2">
  <NotificationsDropdown notifications={newProposalNotifications} />
  <Button onClick={() => navigate("/projects/new")} ...>
  <UserHeader />
</div>
```

### Phase 3: Remove 24-Hour Filter (Medium Priority)

**File: `src/pages/Dashboard.tsx`**

Remove lines 181-183 that create the 24-hour cutoff:
```typescript
// REMOVE these lines:
const twentyFourHoursAgo = new Date();
twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

// REMOVE this filter:
.gte('submitted_at', twentyFourHoursAgo.toISOString())
```

### Phase 4: Fix Proposal Approval Dialog Flow (Medium Priority)

**File: `src/components/ProposalComparisonDialog.tsx`**

Update the `onSuccess` handler (around line 1188):
```typescript
<ProposalApprovalDialog
  open={approvalDialogOpen}
  onOpenChange={setApprovalDialogOpen}
  proposal={selectedProposal}
  onSuccess={() => {
    setApprovalDialogOpen(false);
    setSelectedProposal(null);       // ← Reset selection
    fetchProposals();                 // ← Refresh data
  }}
/>
```

### Phase 5: Create Notification for Counter-Offers (Enhancement)

**New Edge Function: `supabase/functions/notify-proposal-resubmitted/index.ts`**

Create a new edge function similar to `notify-proposal-submitted` that:
- Sends email to entrepreneur when advisor resubmits a counter-offer
- Uses same template structure

**Update: `src/hooks/useProposalSubmit.ts`**

When submitting a counter-offer (resubmission), call the new notification function.

---

## Testing Checklist

After implementation:

1. **Approval Flow**
   - Open comparison dialog
   - Approve a proposal
   - Verify approval dialog closes
   - Verify comparison dialog shows updated status
   - Verify project detail shows "Approved" status

2. **Dashboard Notifications**
   - Submit a proposal as advisor
   - Login as entrepreneur
   - Verify notification bell shows count
   - Verify clicking notification navigates to project

3. **Counter-Offer Visibility**
   - Submit counter-offer as advisor
   - Login as entrepreneur
   - Verify project shows in top of list
   - Verify notification badge appears
   - Verify counter-offer is visible in proposals tab

4. **Prioritization**
   - Have proposals older than 24 hours that are unseen
   - Verify project still appears at top of list
