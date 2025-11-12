/**
 * File utilities for sanitization and validation
 */

/**
 * Sanitize folder names to prevent path traversal and encoding issues
 * Converts Hebrew/special characters to safe ASCII equivalents
 */
export const sanitizeFolderName = (name: string): string => {
  // Hebrew to ASCII mapping for common advisor types
  const hebrewToAscii: Record<string, string> = {
    'אדריכל': 'architect',
    'עורך דין מקרקעין': 'real-estate-lawyer',
    'עו"ד מקרקעין': 'real-estate-lawyer',
    'מודד': 'surveyor',
    'מהנדס': 'engineer',
    'יועץ': 'consultant',
    'רואה חשבון': 'accountant',
    'שמאי מקרקעין': 'appraiser',
    'קבלן': 'contractor',
    'מתכנן': 'planner'
  };

  // Check for exact match first
  if (hebrewToAscii[name]) {
    return hebrewToAscii[name];
  }

  // Fallback: sanitize to ASCII-safe characters
  return name
    .normalize('NFD') // Decompose Unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[\u0590-\u05FF]/g, '') // Remove Hebrew characters
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Trim hyphens from start/end
    .toLowerCase()
    .substring(0, 50) // Limit length
    || 'advisor'; // Fallback if empty after sanitization
};

/**
 * Sanitize file names to prevent directory traversal
 */
export const sanitizeFileName = (fileName: string): string => {
  // Remove directory traversal attempts
  let sanitized = fileName.replace(/\.\./g, '');
  
  // Remove path separators
  sanitized = sanitized.replace(/[\/\\]/g, '_');
  
  // Get file extension
  const lastDotIndex = sanitized.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? sanitized.substring(0, lastDotIndex) : sanitized;
  const extension = lastDotIndex > 0 ? sanitized.substring(lastDotIndex) : '';
  
  // Clean base name - preserve original characters but remove dangerous ones
  const cleanBaseName = baseName
    .replace(/[<>:"|?*]/g, '_') // Remove Windows-forbidden characters
    .replace(/\0/g, '') // Remove null bytes
    .substring(0, 200); // Limit length
  
  return cleanBaseName + extension;
};

/**
 * Validate file type based on extension
 */
export const isValidFileType = (fileName: string, allowedExtensions?: string[]): boolean => {
  const defaultAllowed = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 
    'ppt', 'pptx', 'txt', 'rtf',
    'jpg', 'jpeg', 'png', 'gif', 'bmp',
    'dwg', 'dxf', 'rvt', 'skp', // CAD files
    'zip', 'rar', '7z' // Archives
  ];
  
  const allowed = allowedExtensions || defaultAllowed;
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  return extension ? allowed.includes(extension) : false;
};

/**
 * Format file size to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Validate file size
 */
export const isValidFileSize = (bytes: number, maxMB: number = 10): boolean => {
  return bytes <= maxMB * 1024 * 1024;
};
