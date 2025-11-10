import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !roles || roles.length === 0) {
      throw new Error('Admin access required');
    }

    console.log('[SYNC] Starting email sync process...');

    // Fetch all profiles with NULL or empty email
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .or('email.is.null,email.eq.');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`[SYNC] Found ${profiles?.length || 0} profiles with missing emails`);

    let synced = 0;
    let failed = 0;
    let alreadySynced = 0;

    for (const profile of profiles || []) {
      try {
        // Get user email from auth.users
        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(
          profile.user_id
        );

        if (authUserError) {
          console.error(`[SYNC] Failed to get auth user ${profile.user_id}:`, authUserError.message);
          failed++;
          continue;
        }

        if (!authUser.user?.email) {
          console.warn(`[SYNC] No email found for user ${profile.user_id}`);
          failed++;
          continue;
        }

        // Update profile with email from auth.users
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ email: authUser.user.email })
          .eq('user_id', profile.user_id);

        if (updateError) {
          console.error(`[SYNC] Failed to update profile ${profile.user_id}:`, updateError.message);
          failed++;
          continue;
        }

        console.log(`[SYNC] Synced email for user ${profile.user_id}: ${authUser.user.email}`);
        synced++;
      } catch (error) {
        console.error(`[SYNC] Error processing profile ${profile.user_id}:`, error);
        failed++;
      }
    }

    const result = {
      success: true,
      synced,
      failed,
      total: profiles?.length || 0,
    };

    console.log('[SYNC] Sync complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[SYNC] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
