import { supabase } from "@/integrations/supabase/client";

export async function logAdminAction(
  action: string,
  targetTable: string,
  targetId: string | null = null,
  oldValues?: any,
  newValues?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user for audit log');
      return;
    }

    await supabase.from('admin_audit_log').insert({
      admin_id: user.id,
      action,
      target_table: targetTable,
      target_id: targetId,
      old_values: oldValues || null,
      new_values: newValues || null,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}
