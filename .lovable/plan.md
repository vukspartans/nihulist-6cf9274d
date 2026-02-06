
Goal: stop the “column updated_at of relation proposals does not exist” error when submitting a negotiation response.

What’s actually happening (root cause)
- Your database currently has two overloaded functions with the same name:
  1) submit_negotiation_response(p_session_id uuid, p_updated_line_items jsonb, p_consultant_message text)
     - This is the one your UI/edge-function call matches today.
     - It still contains:
       UPDATE proposals ... updated_at = NOW()   (invalid because proposals.updated_at does not exist)
  2) submit_negotiation_response(p_session_id uuid, p_consultant_message text, p_updated_line_items jsonb DEFAULT NULL, p_milestone_adjustments jsonb DEFAULT NULL, p_files jsonb DEFAULT NULL)
     - This newer one correctly removed proposals.updated_at.
- Because PostgREST/Supabase RPC resolves which function to run based on the argument signature, your call is still hitting the old 3-argument version (the one that still updates proposals.updated_at).

Solution approach
- Keep ONE “canonical” implementation (the newer 5-argument function that does not touch proposals.updated_at).
- Replace the old 3-argument function so it becomes a thin wrapper that calls the canonical function.
  - This preserves backwards compatibility with the current caller (UI + edge function) without needing frontend changes.
- Ensure we explicitly DROP/REPLACE the problematic 3-arg function signature so there is no chance the old body remains.

Implementation steps (DB migration)
1) Create a new migration SQL file that:
   - Drops the old 3-argument function (exact signature):
     - DROP FUNCTION IF EXISTS public.submit_negotiation_response(uuid, jsonb, text);
   - Recreates the 3-argument function WITHOUT proposals.updated_at, implemented as a wrapper:
     - CREATE OR REPLACE FUNCTION public.submit_negotiation_response(
         p_session_id uuid,
         p_updated_line_items jsonb,
         p_consultant_message text DEFAULT NULL
       ) RETURNS jsonb
       LANGUAGE plpgsql
       SECURITY DEFINER
       SET search_path TO 'public'
       AS $$
       BEGIN
         RETURN public.submit_negotiation_response(
           p_session_id := p_session_id,
           p_consultant_message := p_consultant_message,
           p_updated_line_items := p_updated_line_items,
           p_milestone_adjustments := NULL,
           p_files := NULL
         );
       END;
       $$;
   - (Optional but recommended) Add a short comment in the migration explaining that this is to prevent overload confusion and remove invalid updated_at usage.
2) Verify in DB that only the wrapper 3-arg function exists (and it has no UPDATE proposals ... updated_at).
   - Quick sanity check: re-open the function definition in Supabase SQL editor or via schema introspection.

TypeScript types (if needed)
- Because you have overloads, the generated `src/integrations/supabase/types.ts` may have become inconsistent or picked the “wrong” signature.
- After the DB fix, we’ll re-check `types.ts` for duplicated function definitions and align it with the actual RPC signature used by the app (3-arg wrapper returning jsonb).
  - This is usually not required for runtime, but it prevents TS confusion and future regressions.

Testing plan (Preview / Test environment)
1) Log in as the advisor (Vendor 2).
2) Go to Negotiations → open the active request.
3) Change at least one line item price and submit response.
4) Confirm:
   - No “proposals.updated_at does not exist” error.
   - A new row is created in proposal_versions (V2/V3…).
   - The proposal status becomes “resubmitted” and current_version increments.
5) Also test the “no line items” case (if applicable) to ensure the wrapper still handles empty arrays.

Expected result
- The RPC call keeps using submit_negotiation_response(p_session_id, p_updated_line_items, p_consultant_message) exactly as it does now, but it will execute the safe implementation that does not reference proposals.updated_at, so the submission succeeds.

Notes / edge cases to watch
- If there are any other callers that pass parameters by position rather than by name, the wrapper maintains the original positional order, so it remains safe.
- This approach avoids risky schema changes (like adding an updated_at column to proposals) and aligns the DB with the existing table structure.
