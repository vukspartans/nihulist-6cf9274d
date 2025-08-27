// Shared project constants to ensure consistency across the app

export const PROJECT_TYPES = [
  'בניין מגורים',
  'בניין משרדים', 
  'תשתיות',
  'שיפוץ ושדרוג'
] as const;

export const PROJECT_PHASES = [
  'תכנון ראשוני',
  'תכנון מפורט',
  'אישורים',
  'ביצוע',
  'גמר',
  'הושלם'
] as const;

export const PROJECT_STATUSES = [
  'draft',
  'active', 
  'paused',
  'completed',
  'deleted'
] as const;

export type ProjectType = typeof PROJECT_TYPES[number];
export type ProjectPhase = typeof PROJECT_PHASES[number];
export type ProjectStatus = typeof PROJECT_STATUSES[number];