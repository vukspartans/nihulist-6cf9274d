import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  roles?: string[];
}

interface DeleteUserRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client to verify the requesting user is an admin
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roles) {
      throw new Error('Forbidden: Admin access required');
    }

    const { action } = await req.json();

    if (action === 'create') {
      const { email, password, name, phone, roles: userRoles }: CreateUserRequest = await req.json();

      // Create the user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name,
          phone,
        }
      });

      if (createError) {
        throw createError;
      }

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          name: name || '',
          phone: phone || null,
          role: 'entrepreneur', // Default role
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // Assign roles if provided
      if (userRoles && userRoles.length > 0) {
        const roleInserts = userRoles.map(role => ({
          user_id: newUser.user.id,
          role: role,
          created_by: user.id,
        }));

        const { error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .insert(roleInserts);

        if (rolesError) {
          console.error('Roles assignment error:', rolesError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: newUser.user,
          message: 'User created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else if (action === 'delete') {
      const { userId }: DeleteUserRequest = await req.json();

      // Prevent deleting yourself
      if (userId === user.id) {
        throw new Error('Cannot delete your own account');
      }

      // Delete the user (this will cascade to profiles and user_roles)
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'User deleted successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' || error.message.includes('Forbidden') ? 403 : 400
      }
    );
  }
});
