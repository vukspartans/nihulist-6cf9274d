/**
 * PHASE 5: Application Constants
 * Centralized configuration values
 */

// Deadline Configuration
export const DEADLINES = {
  DEFAULT_RFP_HOURS: 168, // 7 days
  WARNING_HOURS: 24, // Show warning when less than 24 hours
  URGENT_HOURS: 6, // Mark as urgent when less than 6 hours
} as const;

// Query Cache Configuration
export const CACHE_TIMES = {
  // Fast-changing data (proposals, RFP status)
  REALTIME: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  
  // Medium-changing data (advisor profiles, projects)
  STANDARD: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // Slow-changing data (static lists, company info)
  STABLE: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_FILES: 10,
  MAX_FILE_SIZE_MB: 5,
  MAX_TOTAL_SIZE_MB: 50,
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ],
} as const;

// Proposal Validation
export const PROPOSAL_VALIDATION = {
  MIN_PRICE: 1,
  MAX_PRICE: 100000000,
  MIN_TIMELINE_DAYS: 1,
  MAX_TIMELINE_DAYS: 3650,
  MIN_SCOPE_LENGTH: 50,
  MIN_CONDITIONS: 1,
} as const;

// Signature Validation
export const SIGNATURE = {
  MIN_VECTOR_POINTS: 10,
  REQUIRED_FIELDS: ['png', 'vector', 'timestamp'] as const,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// Status Labels (Hebrew)
export const STATUS_LABELS = {
  RFP_INVITE: {
    pending: 'ממתין',
    sent: 'נשלח',
    opened: 'נפתח',
    in_progress: 'בעבודה',
    submitted: 'הוגש',
    declined: 'נדחה',
    expired: 'פג תוקף',
  },
  PROPOSAL: {
    draft: 'טיוטה',
    submitted: 'הוגש',
    under_review: 'בבדיקה',
    accepted: 'אושר',
    rejected: 'נדחה',
    withdrawn: 'נמשך',
  },
  PROJECT: {
    draft: 'טיוטה',
    active: 'פעיל',
    completed: 'הושלם',
    archived: 'בארכיון',
  },
} as const;

// Retry Configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
} as const;

// Monitoring Thresholds
export const MONITORING = {
  QUERY_SLOW_THRESHOLD_MS: 500,
  ERROR_RATE_THRESHOLD_PERCENT: 5,
  CONVERSION_FUNNEL_MIN_PERCENT: 60,
} as const;
