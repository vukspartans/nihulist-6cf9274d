import { useMemo } from 'react';
import { AdvisorProfile } from '@/hooks/advisor/useAdvisorProfile';
import { UserProfile } from '@/hooks/advisor/useAdvisorUserData';

export const useProfileCompletion = (
  advisorProfile: AdvisorProfile | null | undefined,
  userProfile: UserProfile | null | undefined
) => {
  return useMemo(() => {
    if (!advisorProfile || !userProfile) {
      return {
        percentage: 0,
        isComplete: false,
        firstMissingField: 'פרטי החברה',
      };
    }

    const requiredFields = [
      { key: 'company_name', label: 'שם החברה', value: advisorProfile.company_name },
      { key: 'expertise', label: 'תחומי מומחיות', value: advisorProfile.expertise?.length > 0 },
      { key: 'location', label: 'מיקום', value: advisorProfile.location },
      { key: 'name', label: 'שם מלא', value: userProfile.name },
      { key: 'phone', label: 'טלפון', value: userProfile.phone },
    ];

    const completedFields = requiredFields.filter(field => field.value).length;
    const percentage = Math.round((completedFields / requiredFields.length) * 100);
    const isComplete = percentage === 100;
    const firstMissing = requiredFields.find(field => !field.value);

    return {
      percentage,
      isComplete,
      firstMissingField: firstMissing?.label || '',
      totalFields: requiredFields.length,
      completedFields,
    };
  }, [advisorProfile, userProfile]);
};
