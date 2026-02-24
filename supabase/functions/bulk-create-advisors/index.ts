import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkAdvisorRow {
  fullName: string;
  phone: string;
  companyName: string;
  email: string;
  expertise: string;
}

interface BulkCreateResponse {
  totalRows: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  created: Array<{
    email: string;
    userId: string;
    name: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { advisors }: { advisors: BulkAdvisorRow[] } = await req.json();

    if (!advisors || !Array.isArray(advisors) || advisors.length === 0) {
      throw new Error("No advisors data provided");
    }

    console.log(`Starting bulk creation of ${advisors.length} advisors`);

    const response: BulkCreateResponse = {
      totalRows: advisors.length,
      successful: 0,
      failed: 0,
      errors: [],
      created: [],
    };

    const DEFAULT_PASSWORD = "Billding2026!";

    for (let i = 0; i < advisors.length; i++) {
      const advisor = advisors[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!advisor.email || !advisor.fullName || !advisor.phone || !advisor.companyName || !advisor.expertise) {
          throw new Error("Missing required fields");
        }

        // Sanitize email
        const email = advisor.email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new Error("Invalid email format");
        }

        // Sanitize phone
        const phone = advisor.phone.replace(/\D/g, "");
        if (phone.length < 9 || phone.length > 10) {
          throw new Error("Invalid Israeli phone number");
        }

        // Parse expertise
        const canonicalMap: Record<string, string> = {
          'אדריכל נוף': 'אדריכל נוף ופיתוח',
          'יועץ פיתוח': 'אדריכל נוף ופיתוח',
          'יועץ אשפה': 'יועץ תברואה',
          'אדריכל ראשי': 'אדריכל',
          'אדריכלית': 'אדריכל',
          'עו"ד מקרקעין': 'עורך דין מקרקעין',
          'עורכת דין מקרקעין': 'עורך דין מקרקעין',
        };
        const expertiseArray = [...new Set(
          advisor.expertise
            .split(",")
            .map(e => e.trim())
            .filter(e => e.length > 0)
            .map(e => canonicalMap[e] ?? e)
        )];

        if (expertiseArray.length === 0) {
          throw new Error("At least one expertise is required");
        }

        console.log(`Creating advisor ${rowNumber}/${advisors.length}: ${email}`);

        // Create auth user with default password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: DEFAULT_PASSWORD,
          email_confirm: true,
          user_metadata: {
            name: advisor.fullName,
            phone,
            company_name: advisor.companyName,
            role: "advisor",
            requires_password_change: true,
          },
        });

        if (authError) {
          if (authError.message.includes("already registered")) {
            throw new Error("Email already exists");
          }
          throw authError;
        }

        if (!authData.user) {
          throw new Error("Failed to create user");
        }

        const userId = authData.user.id;

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .insert({
            user_id: userId,
            name: advisor.fullName,
            phone,
            company_name: advisor.companyName,
            email,
            role: "advisor",
            requires_password_change: true,
            tos_accepted_at: null,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Try to delete the auth user if profile creation fails
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw new Error("Failed to create profile");
        }

        // Create advisor role
        const { error: roleError } = await supabaseAdmin
          .from("user_roles")
          .insert({
            user_id: userId,
            role: "advisor",
            created_by: user.id,
          });

        if (roleError) {
          console.error("Role creation error:", roleError);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw new Error("Failed to assign advisor role");
        }

        // Create advisor record
        const { error: advisorError } = await supabaseAdmin
          .from("advisors")
          .insert({
            user_id: userId,
            company_name: advisor.companyName,
            expertise: expertiseArray,
            is_active: true,
            admin_approved: true,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
          });

        if (advisorError) {
          console.error("Advisor creation error:", advisorError);
          await supabaseAdmin.auth.admin.deleteUser(userId);
          throw new Error("Failed to create advisor record");
        }

        // Send welcome email
        try {
          await resend.emails.send({
            from: "Billding <onboarding@billding.ai>",
            to: [email],
            subject: "ברוך הבא למערכת Billding!",
            html: `
              <!DOCTYPE html>
              <html dir="rtl" lang="he">
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; direction: rtl;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">
                  <h1 style="color: #333; text-align: center;">ברוך הבא למערכת Billding!</h1>
                  
                  <p style="color: #666; font-size: 16px;">שלום ${advisor.fullName},</p>
                  
                  <p style="color: #666; font-size: 16px;">
                    חשבון יועץ נוצר עבורך במערכת Billding על ידי מנהל המערכת.
                  </p>
                  
                  <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">פרטי התחברות שלך:</h3>
                    <p style="color: #666; margin: 10px 0;"><strong>אימייל:</strong> ${email}</p>
                    <p style="color: #666; margin: 10px 0;"><strong>סיסמה זמנית:</strong> ${DEFAULT_PASSWORD}</p>
                  </div>
                  
                  <div style="background-color: #fff3cd; border-right: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ חשוב!</p>
                    <p style="color: #856404; margin: 5px 0 0 0;">
                      בכניסה הראשונה למערכת תתבקש:
                    </p>
                    <ul style="color: #856404; margin: 10px 0;">
                      <li>לשנות את הסיסמה לסיסמה חדשה ומאובטחת</li>
                      <li>לאשר את תנאי השימוש של המערכת</li>
                    </ul>
                  </div>
                  
                  <p style="text-align: center; margin-top: 30px;">
                    <a href="https://billding.ai/auth?type=advisor&mode=login"
                       style="display: inline-block; background-color: #4F46E5; color: white; padding: 14px 40px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      התחבר למערכת
                    </a>
                  </p>
                  
                  <p style="color: #999; font-size: 14px; text-align: center; margin-top: 30px; 
                            border-top: 1px solid #eee; padding-top: 20px;">
                    Billding - מערכת ניהול פרויקטים ויועצים
                  </p>
                </div>
              </body>
              </html>
            `,
          });
          console.log(`Welcome email sent to ${email}`);
        } catch (emailError) {
          console.error("Email error:", emailError);
          // Don't fail the creation if email fails
        }

        response.successful++;
        response.created.push({
          email,
          userId,
          name: advisor.fullName,
        });

        console.log(`Successfully created advisor: ${email}`);

      } catch (error: any) {
        console.error(`Error creating advisor at row ${rowNumber}:`, error);
        response.failed++;
        response.errors.push({
          row: rowNumber,
          email: advisor.email || "unknown",
          error: error.message || "Unknown error",
        });
      }
    }

    console.log(`Bulk creation completed: ${response.successful} successful, ${response.failed} failed`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Bulk creation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);