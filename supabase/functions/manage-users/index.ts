import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  action: string;
  email: string;
  password: string;
  name?: string;
  phone?: string;
  roles?: string[];
  // Advisor-specific fields
  companyName?: string;
  location?: string;
  expertise?: string[];
  specialties?: string[];
  activityRegions?: string[];
}

interface DeleteUserRequest {
  action: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting manage-users function');
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
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

    // Extract the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '');

    // Verify the user is authenticated using the token directly
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      throw new Error('Unauthorized');
    }

    console.log('User authenticated:', user.id);

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roles) {
      console.error('Admin check failed:', roleError);
      throw new Error('Forbidden: Admin access required');
    }

    console.log('Admin verified');

    const requestData = await req.json();
    const { action } = requestData;

    if (action === 'create') {
      const { 
        email, 
        password, 
        name, 
        phone, 
        roles: userRoles,
        companyName,
        location,
        expertise,
        specialties,
        activityRegions
      } = requestData as CreateUserRequest;

      console.log('Creating user:', email, 'with roles:', userRoles);

      // Determine if this is an advisor
      const isAdvisor = userRoles && userRoles.includes('advisor');
      const profileRole = isAdvisor ? 'advisor' : 'entrepreneur';

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
        console.error('User creation error:', createError);
        throw createError;
      }

      console.log('User created:', newUser.user.id);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          user_id: newUser.user.id,
          email: email,
          name: name || '',
          phone: phone || null,
          role: profileRole,
          admin_approved: true, // Admin-created users are pre-approved
          requires_password_change: true, // Force password change on first login
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // If advisor, create advisors table entry
      if (isAdvisor) {
        console.log('Creating advisor record for user:', newUser.user.id);
        const { error: advisorError } = await supabaseAdmin
          .from('advisors')
          .insert({
            user_id: newUser.user.id,
            company_name: companyName || null,
            location: location || null,
            expertise: expertise || [],
            specialties: specialties || [],
            activity_regions: activityRegions || [],
            is_active: true,
            admin_approved: true,
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          });

        if (advisorError) {
          console.error('Advisor creation error:', advisorError);
          // Don't fail - advisor can update profile later
        } else {
          console.log('Advisor record created successfully');
        }
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

      // Send welcome email
      try {
        const isAdmin = userRoles && userRoles.includes('admin');
        const adminUrl = 'https://billding.ai/heyadmin/login';
        const userUrl = 'https://billding.ai/auth';
        
        const emailResponse = await resend.emails.send({
          from: "Billding <onboarding@billding.ai>",
          to: [email],
          subject: isAdmin ? "החשבון שלך נוצר - מנהל מערכת" : "ברוך הבא ל-Billding",
          html: `
            <!DOCTYPE html>
            <html dir="rtl" lang="he">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; direction: rtl;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h1 style="color: #333; text-align: center;">${isAdmin ? 'חשבון מנהל נוצר בהצלחה' : 'ברוך הבא ל-Billding!'}</h1>
                
                ${name ? `<p style="color: #666; font-size: 16px;">שלום ${name},</p>` : ''}
                
                <p style="color: #666; font-size: 16px;">
                  ${isAdmin 
                    ? 'חשבון המנהל שלך נוצר בהצלחה במערכת Billding.'
                    : 'חשבונך נוצר בהצלחה במערכת Billding.'
                  }
                </p>
                
                <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                  <h3 style="color: #333; margin-top: 0;">פרטי התחברות:</h3>
                  <p style="color: #666; margin: 10px 0;"><strong>אימייל:</strong> ${email}</p>
                  <p style="color: #666; margin: 10px 0;"><strong>סיסמה:</strong> ${password}</p>
                </div>
                
                <p style="color: #d9534f; font-size: 14px; background-color: #f2dede; padding: 10px; border-radius: 5px;">
                  <strong>חשוב:</strong> אנא שמור את הסיסמה במקום בטוח ושנה אותה לאחר הכניסה הראשונה.
                </p>
                
                ${isAdmin 
                  ? `<p style="color: #666; font-size: 16px; margin-top: 20px;">כעת תוכל להתחבר לפאנל הניהול בכתובת:</p><p style="text-align: center;"><a href="${adminUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">התחבר לפאנל הניהול</a></p>`
                  : `<p style="color: #666; font-size: 16px; margin-top: 20px;">כעת תוכל להתחבר למערכת ולהתחיל להשתמש בשירותים שלנו.</p><p style="text-align: center;"><a href="${userUrl}" style="display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">התחבר למערכת</a></p>`
                }
                
                <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                  Billding - מערכת ניהול פרויקטים והצעות מחיר
                </p>
              </div>
            </body>
            </html>
          `,
        });

        console.log('Welcome email sent:', emailResponse);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the entire operation if email fails
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
      const { userId } = requestData as DeleteUserRequest;

      console.log('Deleting user:', userId);

      // Prevent deleting yourself
      if (userId === user.id) {
        throw new Error('Cannot delete your own account');
      }

      // First, get the advisor_id if user is an advisor
      const { data: advisorData } = await supabaseAdmin
        .from('advisors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      // Delete related data in order (to respect foreign key constraints)
      // If the user is an advisor, we must delete any rows that reference advisors.id first.

      // 1. Advisor-linked cleanup
      if (advisorData?.id) {
        const advisorId = advisorData.id;

        // 1a. Proposals (and children)
        const { data: proposalsForAdvisor, error: proposalsFetchError } = await supabaseAdmin
          .from('proposals')
          .select('id')
          .eq('advisor_id', advisorId);

        if (proposalsFetchError) {
          console.error('Failed fetching proposals for advisor:', proposalsFetchError);
          throw new Error('Failed fetching proposals for advisor');
        }

        const proposalIds = (proposalsForAdvisor ?? []).map((p: { id: string }) => p.id);

        if (proposalIds.length > 0) {
          // Negotiation sessions and related tables
          const { data: sessions, error: sessionsFetchError } = await supabaseAdmin
            .from('negotiation_sessions')
            .select('id')
            .in('proposal_id', proposalIds);

          if (sessionsFetchError) {
            console.error('Failed fetching negotiation sessions:', sessionsFetchError);
            throw new Error('Failed fetching negotiation sessions');
          }

          const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);

          if (sessionIds.length > 0) {
            const { error: commentsDeleteError } = await supabaseAdmin
              .from('negotiation_comments')
              .delete()
              .in('session_id', sessionIds);
            if (commentsDeleteError) {
              console.error('Failed deleting negotiation comments:', commentsDeleteError);
              throw new Error('Failed deleting negotiation comments');
            }

            const { error: lineItemNegotiationsDeleteError } = await supabaseAdmin
              .from('line_item_negotiations')
              .delete()
              .in('session_id', sessionIds);
            if (lineItemNegotiationsDeleteError) {
              console.error('Failed deleting line item negotiations:', lineItemNegotiationsDeleteError);
              throw new Error('Failed deleting line item negotiations');
            }

            const { error: sessionsDeleteError } = await supabaseAdmin
              .from('negotiation_sessions')
              .delete()
              .in('id', sessionIds);
            if (sessionsDeleteError) {
              console.error('Failed deleting negotiation sessions:', sessionsDeleteError);
              throw new Error('Failed deleting negotiation sessions');
            }
          }

          // Proposal children
          const { error: proposalLineItemsDeleteError } = await supabaseAdmin
            .from('proposal_line_items')
            .delete()
            .in('proposal_id', proposalIds);
          if (proposalLineItemsDeleteError) {
            console.error('Failed deleting proposal line items:', proposalLineItemsDeleteError);
            throw new Error('Failed deleting proposal line items');
          }

          const { error: proposalVersionsDeleteError } = await supabaseAdmin
            .from('proposal_versions')
            .delete()
            .in('proposal_id', proposalIds);
          if (proposalVersionsDeleteError) {
            console.error('Failed deleting proposal versions:', proposalVersionsDeleteError);
            throw new Error('Failed deleting proposal versions');
          }

          // Signatures that may reference proposal approvals
          const { error: signaturesDeleteError } = await supabaseAdmin
            .from('signatures')
            .delete()
            .in('entity_id', proposalIds);
          if (signaturesDeleteError) {
            console.error('Failed deleting signatures:', signaturesDeleteError);
            throw new Error('Failed deleting signatures');
          }

          // Finally the proposals
          const { error: proposalsDeleteError } = await supabaseAdmin
            .from('proposals')
            .delete()
            .in('id', proposalIds);
          if (proposalsDeleteError) {
            console.error('Failed deleting proposals:', proposalsDeleteError);
            throw new Error('Failed deleting proposals');
          }
        }

        // 1b. RFP invites that reference advisors.id (this was the FK violation)
        const { error: invitesDeleteError } = await supabaseAdmin
          .from('rfp_invites')
          .delete()
          .eq('advisor_id', advisorId);
        if (invitesDeleteError) {
          console.error('Failed deleting rfp_invites for advisor:', invitesDeleteError);
          throw new Error('Failed deleting RFP invites');
        }

        // 1c. Advisor team members
        console.log('Deleting advisor team members for advisor:', advisorId);
        const { error: teamDeleteError } = await supabaseAdmin
          .from('advisor_team_members')
          .delete()
          .eq('advisor_id', advisorId);
        if (teamDeleteError) {
          console.error('Failed deleting advisor team members:', teamDeleteError);
          throw new Error('Failed deleting advisor team members');
        }
      }

      // 2. Company memberships
      console.log('Deleting company members for user:', userId);
      const { error: companyMembersDeleteError } = await supabaseAdmin
        .from('company_members')
        .delete()
        .eq('user_id', userId);
      if (companyMembersDeleteError) {
        console.error('Failed deleting company members:', companyMembersDeleteError);
        throw new Error('Failed deleting company members');
      }

      // 3. User roles
      console.log('Deleting user roles for user:', userId);
      const { error: rolesDeleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (rolesDeleteError) {
        console.error('Failed deleting user roles:', rolesDeleteError);
        throw new Error('Failed deleting user roles');
      }

      // 4. Advisor record
      if (advisorData?.id) {
        console.log('Deleting advisor record:', advisorData.id);
        const { error: advisorDeleteError } = await supabaseAdmin
          .from('advisors')
          .delete()
          .eq('id', advisorData.id);
        if (advisorDeleteError) {
          console.error('Failed deleting advisor record:', advisorDeleteError);
          throw new Error('Failed deleting advisor record');
        }
      }

      // 5. Delete profile
      console.log('Deleting profile for user:', userId);
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('user_id', userId);
      if (profileDeleteError) {
        console.error('Failed deleting profile:', profileDeleteError);
        throw new Error('Failed deleting profile');
      }

      // 6. Finally delete the auth user
      console.log('Deleting auth user:', userId);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('User deletion error:', deleteError);
        throw deleteError;
      }

      console.log('User deleted successfully');

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
    console.error('Error in manage-users:', error);
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
