/**
 * Shared cron authentication helper.
 * Validates requests using either:
 * 1. CRON_SECRET header (for pg_cron via pg_net or external schedulers)
 * 2. Supabase service role key in Authorization header (for internal calls)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function validateCronRequest(req: Request): Response | null {
  // Check x-cron-secret header
  const cronSecret = Deno.env.get('CRON_SECRET');
  const cronHeader = req.headers.get('x-cron-secret');

  if (cronSecret && cronHeader === cronSecret) {
    return null; // Authorized
  }

  // Fallback: check if caller is using service role key via Authorization header
  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return null; // Authorized
  }

  console.warn('[CronAuth] Unauthorized request rejected');
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
