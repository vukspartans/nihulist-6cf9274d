import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { withCronSecurity } from '../_shared/cron-auth.ts';

serve(withCronSecurity('expire-rfps', async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { error } = await supabase.rpc('expire_old_rfp_invites');
  if (error) throw error;

  const { count } = await supabase
    .from('rfp_invites')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'expired')
    .gte('updated_at', new Date(Date.now() - 60 * 1000).toISOString());

  console.log(`Expired ${count} RFP invites`);

  return new Response(
    JSON.stringify({ success: true, expired_count: count }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}));
