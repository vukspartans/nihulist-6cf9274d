import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@4.0.0';
import { withCronSecurity } from '../_shared/cron-auth.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const FROM_EMAIL = 'Billding <noreply@billding.ai>';

serve(withCronSecurity('notify-payment-status', async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { type, payment_request_id, milestone_id } = await req.json();
  console.log(`[Payment Notification] Type: ${type}, Request: ${payment_request_id}, Milestone: ${milestone_id}`);

  if (type === 'milestone_unlocked' && milestone_id) {
    const { data: milestone } = await supabase
      .from('payment_milestones')
      .select(`
        id, name, amount, project_id,
        project_advisor:project_advisors!payment_milestones_project_advisor_id_fkey (
          id, advisor_id,
          advisors!fk_project_advisors_advisor ( id, user_id, company_name )
        )
      `)
      .eq('id', milestone_id)
      .single();

    if (!milestone?.project_advisor?.advisors?.user_id) {
      return new Response(JSON.stringify({ error: 'Advisor not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: project } = await supabase.from('projects').select('name').eq('id', milestone.project_id).single();
    const advisorUserId = milestone.project_advisor.advisors.user_id;
    const { data: advisorAuth } = await supabase.auth.admin.getUserById(advisorUserId);
    const advisorEmail = advisorAuth?.user?.email;

    if (advisorEmail) {
      const amount = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(milestone.amount);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: advisorEmail,
        subject: `אבן דרך הושלמה – ניתן להגיש חשבון | ${project?.name}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>אבן דרך הושלמה</h2>
            <p>שלום ${milestone.project_advisor.advisors.company_name || 'יועץ'},</p>
            <p>אבן הדרך <strong>"${milestone.name}"</strong> בפרויקט <strong>${project?.name}</strong> הושלמה בהצלחה.</p>
            <p>סכום: <strong>${amount}</strong></p>
            <p>כעת ניתן להגיש בקשת תשלום דרך המערכת.</p>
            <hr/>
            <p style="color: #666; font-size: 12px;">הודעה אוטומטית ממערכת Billding</p>
          </div>
        `,
      });
      console.log(`[Payment Notification] Sent milestone_unlocked email to ${advisorEmail}`);
    }
  }

  if (type === 'payment_marked_paid' && payment_request_id) {
    const { data: request } = await supabase
      .from('payment_requests')
      .select(`
        id, amount, total_amount, request_number, paid_at, project_id,
        project_advisor:project_advisors!payment_requests_project_advisor_id_fkey (
          id, advisor_id,
          advisors!fk_project_advisors_advisor ( id, user_id, company_name )
        ),
        payment_milestone:payment_milestones!payment_requests_payment_milestone_id_fkey ( id, name )
      `)
      .eq('id', payment_request_id)
      .single();

    if (!request?.project_advisor?.advisors?.user_id) {
      return new Response(JSON.stringify({ error: 'Advisor not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: project } = await supabase.from('projects').select('name, owner_id').eq('id', request.project_id).single();

    let investorName = 'יזם';
    if (project?.owner_id) {
      const { data: profile } = await supabase.from('profiles').select('name, organization_id').eq('user_id', project.owner_id).single();
      if (profile?.organization_id) {
        const { data: company } = await supabase.from('companies').select('name').eq('id', profile.organization_id).single();
        investorName = company?.name || profile?.name || 'יזם';
      } else {
        investorName = profile?.name || 'יזם';
      }
    }

    const advisorUserId = request.project_advisor.advisors.user_id;
    const { data: advisorAuth } = await supabase.auth.admin.getUserById(advisorUserId);
    const advisorEmail = advisorAuth?.user?.email;

    if (advisorEmail) {
      const amount = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(request.total_amount || request.amount);
      const paidDate = request.paid_at ? new Date(request.paid_at).toLocaleDateString('he-IL') : 'לא ידוע';

      await resend.emails.send({
        from: FROM_EMAIL,
        to: advisorEmail,
        subject: `תשלום בוצע – נדרשת חשבונית מס | ${project?.name}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>תשלום בוצע</h2>
            <p>שלום ${request.project_advisor.advisors.company_name || 'יועץ'},</p>
            <p>היזם <strong>${investorName}</strong> מדווח כי חשבון מס׳ <strong>${request.request_number || '—'}</strong> 
            בפרויקט <strong>${project?.name}</strong> שולם בתאריך <strong>${paidDate}</strong>.</p>
            <p>סכום: <strong>${amount}</strong></p>
            <p><strong>נא להנפיק חשבונית מס ולשלוח להנהלת החשבונות של היזם.</strong></p>
            <hr/>
            <p style="color: #666; font-size: 12px;">הודעה אוטומטית ממערכת Billding</p>
          </div>
        `,
      });
      console.log(`[Payment Notification] Sent payment_marked_paid email to ${advisorEmail}`);
    }
  }

  if (type === 'status_changed' && payment_request_id) {
    const { data: request } = await supabase
      .from('payment_requests')
      .select(`
        id, status, request_number, project_id,
        project_advisor:project_advisors!payment_requests_project_advisor_id_fkey (
          id, advisor_id,
          advisors!fk_project_advisors_advisor ( id, user_id, company_name )
        )
      `)
      .eq('id', payment_request_id)
      .single();

    if (!request?.project_advisor?.advisors?.user_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'no advisor' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const { data: statusDef } = await supabase.from('payment_status_definitions').select('name').eq('code', request.status).single();
    const { data: project } = await supabase.from('projects').select('name').eq('id', request.project_id).single();

    const advisorUserId = request.project_advisor.advisors.user_id;
    const { data: advisorAuth } = await supabase.auth.admin.getUserById(advisorUserId);
    const advisorEmail = advisorAuth?.user?.email;

    if (advisorEmail) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: advisorEmail,
        subject: `עדכון סטטוס חשבון | ${project?.name}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>עדכון סטטוס בקשת תשלום</h2>
            <p>שלום ${request.project_advisor.advisors.company_name || 'יועץ'},</p>
            <p>בקשת תשלום מס׳ <strong>${request.request_number || '—'}</strong> 
            בפרויקט <strong>${project?.name}</strong> עברה לסטטוס: <strong>${statusDef?.name || request.status}</strong></p>
            <hr/>
            <p style="color: #666; font-size: 12px;">הודעה אוטומטית ממערכת Billding</p>
          </div>
        `,
      });
      console.log(`[Payment Notification] Sent status_changed email to ${advisorEmail}`);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}));
