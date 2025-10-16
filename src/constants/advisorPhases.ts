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
    description: 'יועצים קריטיים להתחלת הפרויקט - חובה',
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

// Mapping of advisor types to phases for each project category
export const ADVISOR_PHASES_BY_PROJECT_TYPE: Record<string, Record<string, number>> = {
  'פינוי־בינוי (מתחמים)': {
    // Phase 1 - Must have
    'אדריכל': 1,
    'עורך דין מקרקעין': 1,
    
    // Phase 2 - Important
    'אגרונום': 2,
    'מודד מוסמך': 2,
    
    // Phase 3 - Recommended
    'יועץ אינסטלציה': 3,
    'יועץ מיזוג אוויר': 3,
    'יועץ כבישים תנועה וחניה': 3,
    'יועץ פיתוח': 3,
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
    'סוקר אסבסט': 3
  },
  'תמ"א 38/1 – חיזוק ותוספות': {
    // Phase 1 - Must have
    'אדריכל': 1,
    'עורך דין מקרקעין': 1,
    
    // Phase 2 - Important
    'אגרונום': 2,
    'מודד מוסמך': 2,
    
    // Phase 3 - Recommended
    'יועץ אינסטלציה': 3,
    'יועץ מיזוג אוויר': 3,
    'יועץ כבישים תנועה וחניה': 3,
    'יועץ פיתוח': 3,
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
    'סוקר אסבסט': 3
  },
  'תמ"א 38/2 – הריסה ובנייה מחדש': {
    // Phase 1 - Must have
    'אדריכל': 1,
    'עורך דין מקרקעין': 1,
    
    // Phase 2 - Important
    'אגרונום': 2,
    'מודד מוסמך': 2,
    
    // Phase 3 - Recommended
    'יועץ אינסטלציה': 3,
    'יועץ מיזוג אוויר': 3,
    'יועץ כבישים תנועה וחניה': 3,
    'יועץ פיתוח': 3,
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
    'סוקר אסבסט': 3
  }
};

export const getAdvisorPhase = (projectType: string, advisorType: string): number | undefined => {
  return ADVISOR_PHASES_BY_PROJECT_TYPE[projectType]?.[advisorType];
};

export const getPhaseInfo = (phaseId: number): AdvisorPhase | undefined => {
  return ADVISOR_PHASES[phaseId];
};
