
# Fix: Proposal Email Link Returns 404

## Problem

The "notify-proposal-submitted" Edge Function generates the URL:
```
https://billding.ai/project/{id}
```

But the actual route in `App.tsx` is:
```
/projects/:id
```

The missing "s" in "project" causes a 404 when the entrepreneur clicks the link in their email.

## Fix

In `supabase/functions/notify-proposal-submitted/index.ts`, line 124, change:

```typescript
// Before
const projectUrl = `https://billding.ai/project/${project.id}`;

// After
const projectUrl = `https://billding.ai/projects/${project.id}`;
```

Additionally, append `?tab=received` so the entrepreneur lands directly on the received proposals tab:

```typescript
const projectUrl = `https://billding.ai/projects/${project.id}?tab=received`;
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/notify-proposal-submitted/index.ts` | Fix URL from `/project/` to `/projects/` and add `?tab=received` |
