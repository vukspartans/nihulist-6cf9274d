export interface AdvisorPhase {
  id: number;
  name: string;
  description: string;
  color: 'blue' | 'orange' | 'yellow' | 'gray';
  priority: 'must-have' | 'important' | 'recommended' | 'optional';
  badgeVariant: 'destructive' | 'default' | 'secondary' | 'outline';
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const ADVISOR_PHASES: Record<number, AdvisorPhase> = {
  1: {
    id: 1,
    name: 'בחינת הפרויקט - שלב 1',
    description: 'יועצים קריטיים להתחלת הפרויקט',
    color: 'blue',
    priority: 'must-have',
    badgeVariant: 'destructive',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-300',
    textClass: 'text-blue-700'
  },
  2: {
    id: 2,
    name: 'תכנון אדריכלי ראשוני - שלב 2',
    description: 'יועצים חשובים לשלב התכנון',
    color: 'orange',
    priority: 'important',
    badgeVariant: 'default',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-300',
    textClass: 'text-orange-700'
  },
  3: {
    id: 3,
    name: 'העלאת יועצים - שלב 3',
    description: 'יועצים מומלצים לשלבים מתקדמים',
    color: 'yellow',
    priority: 'recommended',
    badgeVariant: 'secondary',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-300',
    textClass: 'text-yellow-700'
  }
};

// Common phase mappings for all project types
const COMMON_PHASE_MAPPING: Record<string, number> = {
  // Phase 1 - Must have
  'אדריכל': 1,
  'עורך דין מקרקעין': 1,
  'יועץ בדיקות (TEST)': 1,
  
  // Phase 2 - Important
  'אגרונום': 2,
  'מודד מוסמך': 2,
  
  // Phase 3 - Recommended
  'יועץ אינסטלציה': 3,
  'יועץ מיזוג אוויר': 3,
  'יועץ כבישים תנועה וחניה': 3,
  'יועץ חשמל': 3,
  'יועץ קרקע': 3,
  'יועץ אקוסטיקה': 3,
  'יועץ בנייה ירוקה': 3,
  'יועץ איטום': 3,
  'יועץ בטיחות אש': 3,
  'יועץ קונסטרוקציה': 3,
  'יועץ נגישות': 3,
  'יועץ מיגון': 3,
  'יועץ מעליות': 3,
  'יועץ תרמי': 3,
  'יועץ הידרולוגיה': 3,
  'יועץ אלומיניום': 3,
  'יועץ קרינה': 3,
  'סוקר אסבסט': 3,
  // New/moved to phase 3
  'אדריכל נוף ופיתוח': 3,
  'הדמיות': 3,
  'בדיקת אל הרס': 3,
  'בדיקת אפיון רשת': 3,
  'מכון התעדה (בניה ירוקה)': 3,
  'יועץ תברואה': 3,
  'יועץ גז': 3,
  'יועץ סביבתי': 3,
  'יועץ CFD': 3,
  'הסדרי תנועה': 3,
  'התארגנות אתר': 3,
  'פרסום תכנון ובניה': 3,
};

// Mapping of advisor types to phases for each project category
export const ADVISOR_PHASES_BY_PROJECT_TYPE: Record<string, Record<string, number>> = {
  // Primary mapping - used by the JSON data source
  'תמ"א 38 - פינוי ובינוי': { ...COMMON_PHASE_MAPPING },
  // Fallback mapping - alternate naming convention
  'פינוי־בינוי (מתחמים)': { ...COMMON_PHASE_MAPPING },
  'תמ"א 38/1 – חיזוק ותוספות': { ...COMMON_PHASE_MAPPING },
  'תמ"א 38/2 – הריסה ובנייה מחדש': { ...COMMON_PHASE_MAPPING },
  'מגורים': { ...COMMON_PHASE_MAPPING },
  'מגורים בבנייה רוויה (5–8 קומות)': { ...COMMON_PHASE_MAPPING },
};

import { canonicalizeAdvisor } from '@/lib/canonicalizeAdvisor';

// Normalization helpers (copied from useAdvisorsValidation for consistency)
const normalize = (str: string): string => {
  if (!str) return '';
  let trimmed = str.trim();
  // Remove leading checkbox symbols
  trimmed = trimmed.replace(/^[☐✔✅]\s*/, '');
  return trimmed.trim();
};

const normalizeLegacyProjectType = (legacyType: string): string => {
  if (!legacyType) return '';
  
  const type = legacyType.trim();
  
  // Map legacy types to new standardized types
  if (type.includes('בניין מגורים') || type.includes('בניית בניין מגורים')) {
    return 'מגורים בבנייה רוויה (5–8 קומות)';
  }
  // Check for specific תמ"א subtypes first (before generic check)
  if (type.includes('תמ"א 38/1') || type.includes('חיזוק ותוספות')) {
    return 'תמ"א 38/1 – חיזוק ותוספות';
  }
  if (type.includes('תמ"א 38/2') || type.includes('הריסה ובנייה מחדש')) {
    return 'תמ"א 38/2 – הריסה ובנייה מחדש';
  }
  // Generic תמ"א / פינוי-בינוי (only if not caught by above)
  if (type.includes('תמ"א') || type.includes('התחדשות עירונית') || (type.includes('פינוי') && type.includes('בינוי'))) {
    return 'פינוי־בינוי (מתחמים)';
  }
  if (type.includes('ביוב') || type.includes('ניקוז')) {
    return 'רשתות ביוב וניקוז';
  }
  if (type.includes('מגורים')) {
    return 'מגורים בבנייה רוויה (5–8 קומות)';
  }
  if (type.includes('משרדים') || type.includes('משרד')) {
    return 'בניין משרדים';
  }
  if (type.includes('תעשי')) {
    return 'מבנה תעשייה';
  }
  
  // Return original if no mapping found
  return type;
};

export const getAdvisorPhase = (projectType: string, advisorType: string): number | undefined => {
  // Normalize the project type using same logic as advisors validation
  const legacyNormalized = normalizeLegacyProjectType(projectType);
  const normalizedProjectType = normalize(legacyNormalized);
  
  // Canonicalize the advisor type to handle variations like "אדריכל ראשי" → "אדריכל"
  const canonicalAdvisorType = canonicalizeAdvisor(advisorType);
  
  // Try with normalized type first
  let phases = ADVISOR_PHASES_BY_PROJECT_TYPE[normalizedProjectType];
  
  // Fallback to original normalization
  if (!phases) {
    const originalNormalized = normalize(projectType);
    phases = ADVISOR_PHASES_BY_PROJECT_TYPE[originalNormalized];
  }
  
  // Fallback to exact match as last resort
  if (!phases) {
    phases = ADVISOR_PHASES_BY_PROJECT_TYPE[projectType];
  }
  
  return phases?.[canonicalAdvisorType];
};

export const getPhaseInfo = (phaseId: number): AdvisorPhase | undefined => {
  return ADVISOR_PHASES[phaseId];
};
