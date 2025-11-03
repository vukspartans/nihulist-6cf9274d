/**
 * PHASE 5: Standardized Error Handling Utility
 * Provides consistent error messages and logging across the application
 */

import { toast } from 'sonner';

export interface ErrorContext {
  action: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Handle errors consistently across the application
 */
export const handleError = (
  error: any,
  context: ErrorContext,
  options?: {
    showToast?: boolean;
    logToConsole?: boolean;
    customMessage?: string;
  }
) => {
  const { action, userId, metadata } = context;
  const {
    showToast = true,
    logToConsole = true,
    customMessage,
  } = options || {};

  // Extract error message
  const errorMessage =
    error?.message ||
    error?.error?.message ||
    (typeof error === 'string' ? error : 'שגיאה לא ידועה');

  // Log to console in development
  if (logToConsole && process.env.NODE_ENV === 'development') {
    console.error(`[${action}] Error:`, {
      message: errorMessage,
      userId,
      metadata,
      stack: error?.stack,
      fullError: error,
    });
  }

  // Show user-friendly toast
  if (showToast) {
    const userMessage = customMessage || getContextualErrorMessage(action, errorMessage);
    
    toast.error(userMessage, {
      description: errorMessage,
      duration: 5000,
    });
  }

  // Return structured error for further handling
  return {
    success: false,
    error: errorMessage,
    context: { action, userId, metadata },
  };
};

/**
 * Get context-aware error messages in Hebrew
 */
const getContextualErrorMessage = (action: string, errorMessage: string): string => {
  // Deadline-related errors
  if (errorMessage.includes('deadline has expired')) {
    return 'פג תוקף המועד האחרון להגשה';
  }

  // Database constraint errors
  if (errorMessage.includes('foreign key') || errorMessage.includes('violates')) {
    return 'שגיאת תקינות נתונים - אנא פנה לתמיכה';
  }

  // RLS policy errors
  if (errorMessage.includes('row-level security') || errorMessage.includes('policy')) {
    return 'אין לך הרשאה לבצע פעולה זו';
  }

  // Signature errors
  if (errorMessage.includes('signature')) {
    return 'בעיה בחתימה - אנא נסה שוב';
  }

  // Action-specific messages
  const actionMessages: Record<string, string> = {
    'submit_proposal': 'שגיאה בשליחת הצעת המחיר',
    'approve_proposal': 'שגיאה באישור ההצעה',
    'send_rfp': 'שגיאה בשליחת הזמנות להצעות מחיר',
    'load_rfps': 'שגיאה בטעינת הנתונים',
    'update_profile': 'שגיאה בעדכון הפרופיל',
    'upload_file': 'שגיאה בהעלאת הקובץ',
  };

  return actionMessages[action] || 'אירעה שגיאה - אנא נסה שוב';
};

/**
 * Retry logic for failed operations
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delayMs?: number;
    shouldRetry?: (error: any) => boolean;
  }
): Promise<T> => {
  const { maxRetries = 3, delayMs = 1000, shouldRetry = () => true } = options || {};

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }

  throw lastError;
};

/**
 * Validate required fields before submission
 */
export const validateRequired = (
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } => {
  const missing = requiredFields.filter((field) => {
    const value = data[field];
    return value === null || value === undefined || value === '';
  });

  return {
    valid: missing.length === 0,
    missing,
  };
};
