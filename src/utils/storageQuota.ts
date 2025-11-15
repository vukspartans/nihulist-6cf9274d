/**
 * PHASE 3: Storage Quota Management
 * Simple client-side utilities for managing storage quotas
 */

export const STORAGE_LIMITS = {
  MAX_PROJECT_BYTES: 524288000, // 500 MB per project
  MAX_PROJECT_FILES: 100,
  MAX_FILE_SIZE: 10485760, // 10 MB per file
} as const;

/**
 * Format bytes to human-readable size
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Validate file size before upload
 */
export const validateFileSize = (
  file: File
): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > STORAGE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `הקובץ גדול מדי (${formatBytes(file.size)}). המקסימום המותר הוא ${formatBytes(STORAGE_LIMITS.MAX_FILE_SIZE)}`,
    };
  }

  return { valid: true };
};
