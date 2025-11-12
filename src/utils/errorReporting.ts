/**
 * Utility for creating reportable error messages with technical metadata
 * Used for error toasts that users can copy and share for bug reporting
 */

export const reportableError = (
  title: string,
  description: string,
  metadata?: Record<string, any>
) => {
  const timestamp = new Date().toISOString();
  
  const errorReport = [
    `⚠️ ${title}`,
    description,
    '',
    '--- פרטים טכניים ---',
    `זמן: ${timestamp}`,
    metadata ? `פרטים: ${JSON.stringify(metadata, null, 2)}` : '',
    `דפדפן: ${navigator.userAgent}`,
    `כתובת: ${window.location.href}`
  ].filter(Boolean).join('\n');

  return errorReport;
};

/**
 * Format Supabase error for user-friendly display
 */
export const formatSupabaseError = (error: any): string => {
  if (error?.message?.includes('row-level security')) {
    return 'בעיית הרשאות - נסה להתחבר מחדש למערכת';
  }
  
  if (error?.message?.includes('duplicate key')) {
    return 'רשומה כבר קיימת במערכת';
  }
  
  if (error?.message?.includes('not found')) {
    return 'המידע המבוקש לא נמצא';
  }
  
  return error?.message || 'שגיאה לא ידועה';
};
