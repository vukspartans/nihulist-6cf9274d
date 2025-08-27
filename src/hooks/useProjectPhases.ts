
export interface ProjectPhase {
  name: string;
  required_advisors: string[];
  description: string;
}

export const useProjectPhases = (projectType: string): ProjectPhase[] => {
  const projectPhases: Record<string, ProjectPhase[]> = {
    'בניין מגורים': [
      {
        name: 'תכנון וייעוץ ראשוני',
        required_advisors: ['אדריכל', 'מהנדס קונסטרוקציה', 'יועץ תכנון עירוני'],
        description: 'שלב התכנון הראשוני והיתרים'
      },
      {
        name: 'תכנון מפורט',
        required_advisors: ['מהנדס חשמל', 'מהנדס אינסטלציה', 'יועץ נגישות'],
        description: 'תכנון מערכות ופרטים טכניים'
      },
      {
        name: 'ביצוע ופיקוח',
        required_advisors: ['מפקח בניה', 'יועץ בטיחות', 'מודד'],
        description: 'פיקוח על הביצוע ובטיחות'
      }
    ],
    'בניין משרדים': [
      {
        name: 'תכנון אדריכלי',
        required_advisors: ['אדריכל', 'מהנדס קונסטרוקציה', 'יועץ תכנון עירוני'],
        description: 'תכנון אדריכלי וקונסטרוקטיבי'
      },
      {
        name: 'מערכות ותשתיות',    
        required_advisors: ['מהנדס חשמל', 'מהנדס מיזוג אוויר', 'יועץ תקשורת', 'יועץ נגישות'],
        description: 'תכנון מערכות מתקדמות למבנה משרדים'
      },
      {
        name: 'פיקוח וביצוע',
        required_advisors: ['מפקח בניה', 'יועץ בטיחות', 'מודד'],
        description: 'פיקוח על הביצוע'
      }
    ],
    'תשתיות': [
      {
        name: 'סקר ותכנון',
        required_advisors: ['מהנדס תשתיות', 'מודד', 'יועץ סביבה'],
        description: 'סקר השטח ותכנון התשתיות'
      },
      {
        name: 'ביצוע ופיקוח',
        required_advisors: ['מפקח תשתיות', 'יועץ בטיחות', 'יועץ איכות'],
        description: 'ביצוע התשתיות ופיקוח'
      }
    ],
    'שיפוץ ושדרוג': [
      {
        name: 'הערכה ותכנון',
        required_advisors: ['אדריכל', 'מהנדס קונסטרוקציה', 'יועץ שימור'],
        description: 'הערכת המצב הקיים ותכנון השיפוץ'
      },
      {
        name: 'ביצוע',
        required_advisors: ['מפקח בניה', 'יועץ בטיחות'],
        description: 'ביצוע השיפוץ ופיקוח'
      }
    ]
  };

  return projectPhases[projectType] || [];
};
