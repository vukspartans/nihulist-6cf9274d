/**
 * Organization Activity Categories for Entrepreneur Onboarding
 * Used for company profiling and vendor matching
 */

export type ActivityTier = 'small' | 'medium' | 'large' | 'enterprise';

export interface ActivityOption {
  label: string;
  tier: ActivityTier;
}

export interface ActivityCategory {
  id: string;
  label: string;
  subcategories: string[];
  activityQuestion: string;
  activityOptions: ActivityOption[];
}

export const ORGANIZATION_ACTIVITY_CATEGORIES: Record<string, ActivityCategory> = {
  'התחדשות עירונית': {
    id: 'urban_renewal',
    label: 'התחדשות עירונית',
    subcategories: [
      'תמ״א 38 חיזוק',
      'תמ״א 38 הריסה ובנייה',
      'פינוי בינוי'
    ],
    activityQuestion: 'איך היית מגדיר את היקף הפעילות שלך כיום?',
    activityOptions: [
      { label: 'עד פרויקט אחד פעיל', tier: 'small' },
      { label: '2–4 פרויקטים פעילים', tier: 'medium' },
      { label: '5–10 פרויקטים פעילים', tier: 'large' },
      { label: 'מעל 10 פרויקטים פעילים', tier: 'enterprise' }
    ]
  },
  'יזמות מגורים חדשה': {
    id: 'residential_development',
    label: 'יזמות מגורים חדשה',
    subcategories: [
      'בנייני מגורים',
      'שכונות מגורים',
      'דיור רווי'
    ],
    activityQuestion: 'כמה יחידות דיור אתה מקדם במקביל?',
    activityOptions: [
      { label: 'עד 30 יחידות', tier: 'small' },
      { label: '30–150 יחידות', tier: 'medium' },
      { label: '150–600 יחידות', tier: 'large' },
      { label: 'מעל 600 יחידות', tier: 'enterprise' }
    ]
  },
  'יזמות מסחר ותעסוקה': {
    id: 'commercial_employment',
    label: 'יזמות מסחר ותעסוקה',
    subcategories: [
      'משרדים',
      'מסחר',
      'שימושים מעורבים'
    ],
    activityQuestion: 'מה היקף השטחים שאתה מפתח במקביל?',
    activityOptions: [
      { label: 'עד 5,000 מ״ר', tier: 'small' },
      { label: '5,000–25,000 מ״ר', tier: 'medium' },
      { label: '25,000–100,000 מ״ר', tier: 'large' },
      { label: 'מעל 100,000 מ״ר', tier: 'enterprise' }
    ]
  },
  'מבני ציבור': {
    id: 'public_buildings',
    label: 'מבני ציבור',
    subcategories: [
      'חינוך',
      'בריאות',
      'רווחה',
      'דת וקהילה'
    ],
    activityQuestion: 'כמה פרויקטים מול רשויות אתה מנהל במקביל?',
    activityOptions: [
      { label: 'פרויקט בודד', tier: 'small' },
      { label: '2–3 פרויקטים', tier: 'medium' },
      { label: '4–8 פרויקטים', tier: 'large' },
      { label: 'פעילות רוחבית מול כמה רשויות', tier: 'enterprise' }
    ]
  },
  'תעשייה ולוגיסטיקה': {
    id: 'industry_logistics',
    label: 'תעשייה ולוגיסטיקה',
    subcategories: [
      'מבני תעשייה',
      'מרלו״גים',
      'אחסנה'
    ],
    activityQuestion: 'מה היקף השטחים שאתה מפתח במקביל?',
    activityOptions: [
      { label: 'עד 5,000 מ״ר', tier: 'small' },
      { label: '5,000–25,000 מ״ר', tier: 'medium' },
      { label: '25,000–100,000 מ״ר', tier: 'large' },
      { label: 'מעל 100,000 מ״ר', tier: 'enterprise' }
    ]
  },
  'תשתיות ופיתוח': {
    id: 'infrastructure_development',
    label: 'תשתיות ופיתוח',
    subcategories: [
      'פיתוח עירוני',
      'דרכים ותנועה',
      'תשתיות מים וביוב'
    ],
    activityQuestion: 'מה היקף הפעילות השנתי שלך?',
    activityOptions: [
      { label: 'פרויקט נקודתי', tier: 'small' },
      { label: 'מספר פרויקטים אזוריים', tier: 'medium' },
      { label: 'פעילות מתמשכת במספר רשויות', tier: 'large' },
      { label: 'פעילות ארצית', tier: 'enterprise' }
    ]
  },
  'פרויקטים מיוחדים': {
    id: 'special_projects',
    label: 'פרויקטים מיוחדים',
    subcategories: [
      'שימור',
      'מבנים מורכבים'
    ],
    activityQuestion: 'איך היית מגדיר את היקף הפעילות שלך כיום?',
    activityOptions: [
      { label: 'עד פרויקט אחד פעיל', tier: 'small' },
      { label: '2–4 פרויקטים פעילים', tier: 'medium' },
      { label: '5–10 פרויקטים פעילים', tier: 'large' },
      { label: 'מעל 10 פרויקטים פעילים', tier: 'enterprise' }
    ]
  }
} as const;

export const CATEGORY_KEYS = Object.keys(ORGANIZATION_ACTIVITY_CATEGORIES);

// Activity regions (same as advisor side)
export const ACTIVITY_REGIONS = [
  'צפון',
  'חיפה והקריות',
  'השרון',
  'מרכז',
  'תל אביב והסביבה',
  'ירושלים והסביבה',
  'שפלה',
  'דרום',
  'אילת והערבה',
  'יהודה ושומרון'
] as const;

export type ActivityRegion = typeof ACTIVITY_REGIONS[number];

// Employee count options
export const EMPLOYEE_COUNT_OPTIONS = [
  { value: '1-5', label: '1-5 עובדים' },
  { value: '6-20', label: '6-20 עובדים' },
  { value: '21-50', label: '21-50 עובדים' },
  { value: '51-100', label: '51-100 עובדים' },
  { value: '100+', label: 'מעל 100 עובדים' }
] as const;

// Helper to get tier numeric value for comparisons
export const ACTIVITY_TIER_VALUES: Record<ActivityTier, number> = {
  small: 1,
  medium: 2,
  large: 3,
  enterprise: 4
} as const;
