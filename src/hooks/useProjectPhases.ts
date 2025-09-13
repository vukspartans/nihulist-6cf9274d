
import { useAdvisorsValidation } from './useAdvisorsValidation';

export interface ProjectPhase {
  name: string;
  required_advisors: string[];
  description: string;
}

export const useProjectPhases = (projectType: string): ProjectPhase[] => {
  const { getRecommendedAdvisors } = useAdvisorsValidation();
  
  // Get advisors dynamically from the comprehensive data
  const advisors = getRecommendedAdvisors(projectType);
  
  // Return generic phases with advisors from the comprehensive matrix
  if (advisors.length > 0) {
    return [
      {
        name: 'תכנון ראשוני',
        required_advisors: advisors.slice(0, Math.ceil(advisors.length * 0.4)),
        description: 'שלב התכנון הראשוני והיתרים'
      },
      {
        name: 'תכנון מפורט',
        required_advisors: advisors.slice(Math.ceil(advisors.length * 0.4), Math.ceil(advisors.length * 0.7)),
        description: 'תכנון מערכות ופרטים טכניים'
      },
      {
        name: 'ביצוע ופיקוח',
        required_advisors: advisors.slice(Math.ceil(advisors.length * 0.7)),
        description: 'פיקוח על הביצוע ובטיחות'
      }
    ];
  }
  
  // Fallback for unknown project types
  return [];
};
