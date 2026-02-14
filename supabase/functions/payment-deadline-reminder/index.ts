import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FROM_EMAIL = 'Billding <noreply@billding.ai>';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[Payment Reminder] Starting payment deadline reminder check...');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Also check for upcoming payments (3 days before)
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const threeDaysStr = threeDaysFromNow.toISOString().split('T')[0];

    // 1. Day-after-due-date follow-up to accountant
    // Find payment requests where expected_payment_date was yesterday and status is not paid/rejected
    const { data: overdueRequests } = await supabase
      .from('payment_requests')
      .select(`
        id, amount, total_amount, request_number, expected_payment_date, project_id,
        project_advisor:project_advisors!payment_requests_project_advisor_id_fkey (
          id, advisor_id,
          advisors!fk_project_advisors_advisor ( id, company_name )
        ),
        payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey ( id, name, due_date )
      `)
      .eq('expected_payment_date', yesterdayStr)
      .not('status', 'in', '("paid","rejected","prepared")');

    let overdueCount = 0;
    if (overdueRequests && overdueRequests.length > 0) {
      // Group by project owner (accountant)
      const projectIds = [...new Set(overdueRequests.map((r: any) => r.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, owner_id')
        .in('id', projectIds);

      const ownerIds = [...new Set((projects || []).map(p => p.owner_id))];

      for (const ownerId of ownerIds) {
        const { data: ownerAuth } = await supabase.auth.admin.getUserById(ownerId);
        const ownerEmail = ownerAuth?.user?.email;
        if (!ownerEmail) continue;

        const ownerProjects = (projects || []).filter(p => p.owner_id === ownerId);
        const ownerProjectIds = new Set(ownerProjects.map(p => p.id));
        const relevantRequests = overdueRequests.filter((r: any) => ownerProjectIds.has(r.project_id));

        if (relevantRequests.length === 0) continue;

        const rows = relevantRequests.map((r: any) => {
          const project = ownerProjects.find(p => p.id === r.project_id);
          const amount = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
            .format(r.total_amount || r.amount);
          return `<tr>
            <td style="padding:6px;border:1px solid #ddd">${r.project_advisor?.advisors?.company_name || '—'}</td>
            <td style="padding:6px;border:1px solid #ddd">${project?.name || '—'}</td>
            <td style="padding:6px;border:1px solid #ddd">${r.request_number || '—'}</td>
            <td style="padding:6px;border:1px solid #ddd">${amount}</td>
          </tr>`;
        }).join('');

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ownerEmail,
          subject: `תזכורת: ${relevantRequests.length} חשבונות חרגו ממועד התשלום`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>תזכורת – חשבונות שחרגו ממועד התשלום</h2>
              <p>החשבונות הבאים היו אמורים להיות משולמים אתמול (${new Date(yesterdayStr).toLocaleDateString('he-IL')}):</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="background:#f5f5f5">
                  <th style="padding:6px;border:1px solid #ddd;text-align:right">יועץ</th>
                  <th style="padding:6px;border:1px solid #ddd;text-align:right">פרויקט</th>
                  <th style="padding:6px;border:1px solid #ddd;text-align:right">מס׳ חשבון</th>
                  <th style="padding:6px;border:1px solid #ddd;text-align:right">סכום</th>
                </tr>
                ${rows}
              </table>
              <p>האם החשבונות שולמו? אנא עדכנו במערכת.</p>
              <hr/>
              <p style="color: #666; font-size: 12px;">הודעה אוטומטית ממערכת Billding</p>
            </div>
          `,
        });

        overdueCount += relevantRequests.length;
        console.log(`[Payment Reminder] Sent overdue reminder for ${relevantRequests.length} requests to ${ownerEmail}`);
      }
    }

    // 2. Approaching deadline alerts (3 days before)
    const { data: approachingRequests } = await supabase
      .from('payment_requests')
      .select(`
        id, amount, total_amount, request_number, expected_payment_date, project_id,
        project_advisor:project_advisors!payment_requests_project_advisor_id_fkey (
          id, advisor_id,
          advisors!fk_project_advisors_advisor ( id, company_name )
        )
      `)
      .eq('expected_payment_date', threeDaysStr)
      .not('status', 'in', '("paid","rejected","prepared")');

    let approachingCount = 0;
    if (approachingRequests && approachingRequests.length > 0) {
      const projectIds = [...new Set(approachingRequests.map((r: any) => r.project_id))];
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, owner_id')
        .in('id', projectIds);

      const ownerIds = [...new Set((projects || []).map(p => p.owner_id))];

      for (const ownerId of ownerIds) {
        const { data: ownerAuth } = await supabase.auth.admin.getUserById(ownerId);
        const ownerEmail = ownerAuth?.user?.email;
        if (!ownerEmail) continue;

        const ownerProjects = (projects || []).filter(p => p.owner_id === ownerId);
        const ownerProjectIds = new Set(ownerProjects.map(p => p.id));
        const relevantRequests = approachingRequests.filter((r: any) => ownerProjectIds.has(r.project_id));

        if (relevantRequests.length === 0) continue;

        const totalAmount = relevantRequests.reduce((sum: number, r: any) => sum + (r.total_amount || r.amount), 0);
        const formattedTotal = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(totalAmount);

        await resend.emails.send({
          from: FROM_EMAIL,
          to: ownerEmail,
          subject: `תשלומים מתקרבים: ${formattedTotal} בעוד 3 ימים`,
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>תשלומים מתקרבים</h2>
              <p>${relevantRequests.length} חשבונות בסך ${formattedTotal} צפויים לתשלום בעוד 3 ימים (${new Date(threeDaysStr).toLocaleDateString('he-IL')}).</p>
              <p>אנא ודאו שהתקציב זמין ושהתשלומים יבוצעו בזמן.</p>
              <hr/>
              <p style="color: #666; font-size: 12px;">הודעה אוטומטית ממערכת Billding</p>
            </div>
          `,
        });

        approachingCount += relevantRequests.length;
        console.log(`[Payment Reminder] Sent approaching deadline for ${relevantRequests.length} requests to ${ownerEmail}`);
      }
    }

    console.log(`[Payment Reminder] Done. Overdue: ${overdueCount}, Approaching: ${approachingCount}`);
    return new Response(JSON.stringify({ ok: true, overdue: overdueCount, approaching: approachingCount }), { headers: corsHeaders });
  } catch (error) {
    console.error('[Payment Reminder] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
