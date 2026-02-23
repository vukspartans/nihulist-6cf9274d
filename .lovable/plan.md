

# Remove Lovable & Vibe-Coding Fingerprints

## Summary

Full codebase audit found **5 items** that identify the system as a Lovable-built project. None are visible to end-users in the browser, but they are visible in the source repository and in production emails.

---

## Issues & Fixes

### 1. Remove `lovable-tagger` dependency (High Priority)

**Files:** `vite.config.ts`, `package.json`

- Remove `lovable-tagger` from `devDependencies` in `package.json`
- Remove the `import { componentTagger } from "lovable-tagger"` and `componentTagger()` usage from `vite.config.ts`
- This is a dev-only tool that adds data attributes to components for Lovable's editor -- not needed in a standalone project

### 2. Remove "Lovable Gateway" comment (Low Priority)

**File:** `supabase/functions/analyze-proposal/index.ts` (line 361)

- Change: `// Use OpenAI GPT-5.2 directly (no fallback to Lovable Gateway)`
- To: `// Use OpenAI GPT-5.2 directly`

### 3. Replace `nihulist.lovable.app` URLs in DB triggers (High Priority)

**Files:** 4 Supabase migration files with hardcoded `nihulist.lovable.app` URLs in trigger functions that generate email links sent to users.

**Fix approach:** Create a new migration that re-creates the affected trigger functions using the correct production domain (e.g., `https://billding.ai` or whatever the custom domain is). The old migrations stay as-is (they're historical), but the new migration overrides the function definitions.

**Affected functions (to be identified from the migrations):**
- Task delay notification triggers that build `v_task_url`

**Note:** Need to confirm the correct production domain to use (billding.ai vs another domain).

### 4. Remove `.lovable/` directory (Medium Priority)

**File:** `.lovable/plan.md`

- Delete the `.lovable/` directory entirely -- it's Lovable platform metadata with no runtime purpose

### 5. `components.json` — No action needed

The shadcn schema reference is standard open-source tooling config, not a Lovable fingerprint. Every project using shadcn/ui has this file. No change needed.

---

## Technical Notes

- Removing `lovable-tagger` has zero impact on the app -- it's dev-only and only used by Lovable's visual editor
- The migration fix requires a new SQL migration to redefine the trigger functions with the correct domain. Old migration files are immutable history and don't need editing
- All other files (HTML, README, robots.txt, components) are already clean

## Estimated scope: 4 files modified, 1 directory deleted, 1 new migration created

