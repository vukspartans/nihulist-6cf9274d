/**
 * PHASE 5: Input Sanitization Utilities
 * Prevent XSS and injection attacks
 */

/**
 * Sanitize HTML to prevent XSS (basic implementation)
 * For production, consider using DOMPurify library
 */
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email: string): string | null => {
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  return trimmed;
};

/**
 * Validate and sanitize phone number (Israeli format)
 */
export const sanitizePhone = (phone: string): string | null => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Israeli phone numbers are 9-10 digits
  if (digits.length < 9 || digits.length > 10) {
    return null;
  }
  
  return digits;
};

/**
 * Sanitize file name to prevent directory traversal
 */
export const sanitizeFileName = (fileName: string): string => {
  // Remove directory traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '_');
  
  // Remove special characters except dots, dashes, underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Ensure it has a valid extension
  if (!sanitized.includes('.')) {
    sanitized += '.file';
  }
  
  return sanitized;
};

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize user input text (for notes, descriptions)
 */
export const sanitizeText = (text: string, maxLength: number = 5000): string => {
  let sanitized = text.trim();
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};
