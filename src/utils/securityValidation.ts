/**
 * PHASE 1: Security Validation Utilities
 * Centralized security validation functions
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Validate RFP submission token
 * SECURITY: Prevents unauthorized proposal submissions
 */
export const validateSubmissionToken = async (
  token: string,
  advisorId: string
): Promise<{ valid: boolean; error?: string }> => {
  try {
    const { data: inviteData, error: inviteError } = await supabase
      .from('rfp_invites')
      .select('id, advisor_id, deadline_at, status')
      .eq('submit_token', token)
      .single();

    if (inviteError || !inviteData) {
      return { valid: false, error: 'Invalid or expired submission token' };
    }

    // Check if token is for correct advisor
    if (inviteData.advisor_id !== advisorId) {
      return { valid: false, error: 'Token does not match advisor' };
    }

    // Check deadline
    if (inviteData.deadline_at && new Date(inviteData.deadline_at) < new Date()) {
      return { valid: false, error: 'Submission deadline has passed' };
    }

    // Check status
    if (inviteData.status === 'declined' || inviteData.status === 'expired' || inviteData.status === 'submitted') {
      return { valid: false, error: `Cannot submit proposal: invite is ${inviteData.status}` };
    }

    return { valid: true };
  } catch (error) {
    console.error('[Security] Token validation error:', error);
    return { valid: false, error: 'Token validation failed' };
  }
};

/**
 * Validate price bounds
 * SECURITY: Prevents invalid or malicious price values
 */
export const validatePrice = (price: number): { valid: boolean; error?: string } => {
  if (!price || price <= 0) {
    return { valid: false, error: 'Price must be greater than zero' };
  }
  
  if (price > 999999999) {
    return { valid: false, error: 'Price exceeds maximum allowed value' };
  }

  if (!Number.isFinite(price)) {
    return { valid: false, error: 'Invalid price value' };
  }

  return { valid: true };
};

/**
 * Validate timeline bounds
 * SECURITY: Prevents invalid timeline values
 */
export const validateTimeline = (days: number): { valid: boolean; error?: string } => {
  if (!days || days <= 0) {
    return { valid: false, error: 'Timeline must be greater than zero' };
  }

  if (days > 3650) {
    return { valid: false, error: 'Timeline exceeds maximum of 10 years' };
  }

  if (!Number.isInteger(days)) {
    return { valid: false, error: 'Timeline must be a whole number of days' };
  }

  return { valid: true };
};

/**
 * Validate signature format
 * SECURITY: Ensures signature data integrity
 */
export const validateSignature = (signature: { png: string; vector: any }): { valid: boolean; error?: string } => {
  if (!signature?.png || !signature?.vector) {
    return { valid: false, error: 'Signature is required' };
  }

  if (!signature.png.startsWith('data:image/png;base64,')) {
    return { valid: false, error: 'Invalid signature format' };
  }

  // Check signature size (prevent DOS attacks)
  const base64Data = signature.png.split(',')[1];
  const sizeInBytes = (base64Data.length * 3) / 4;
  const maxSizeInBytes = 1 * 1024 * 1024; // 1MB

  if (sizeInBytes > maxSizeInBytes) {
    return { valid: false, error: 'Signature file too large' };
  }

  return { valid: true };
};

/**
 * Validate file uploads
 * SECURITY: Prevents malicious file uploads
 */
export const validateFileUploads = (
  files: Array<{ name: string; size: number; type: string }>
): { valid: boolean; error?: string } => {
  if (!files || files.length === 0) {
    return { valid: true }; // Files are optional
  }

  // Check file count
  if (files.length > 10) {
    return { valid: false, error: 'Maximum 10 files allowed' };
  }

  // Check total size
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  const maxTotalSize = 50 * 1024 * 1024; // 50MB

  if (totalSize > maxTotalSize) {
    return { valid: false, error: 'Total file size exceeds 50MB limit' };
  }

  // Check individual file sizes
  const maxFileSize = 20 * 1024 * 1024; // 20MB per file
  for (const file of files) {
    if (file.size > maxFileSize) {
      return { valid: false, error: `File ${file.name} exceeds 20MB limit` };
    }

    // Validate file type (allow common document types)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
    ];

    if (file.type && !allowedTypes.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed` };
    }
  }

  return { valid: true };
};

/**
 * Rate limiting check (simple client-side check)
 * SECURITY: Prevents spam and abuse
 */
const rateLimitMap = new Map<string, number[]>();

export const checkRateLimit = (
  key: string,
  maxRequests: number = 5,
  windowMs: number = 60000
): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const requests = rateLimitMap.get(key) || [];
  
  // Remove old requests outside the window
  const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return { 
      allowed: false, 
      error: `Rate limit exceeded. Please try again in ${Math.ceil((windowMs - (now - recentRequests[0])) / 1000)} seconds.` 
    };
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(key, recentRequests);

  return { allowed: true };
};
