/**
 * Phase 2: Duplicate Advisor Detection Hook
 * Prevents selecting the same advisor multiple times for the same project
 */

import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AdvisorSelection {
  advisorId: string;
  advisorType: string;
  advisorName?: string;
}

interface DuplicateCheck {
  hasDuplicates: boolean;
  duplicates: Array<{
    advisorId: string;
    advisorName: string;
    types: string[];
    count: number;
  }>;
  warnings: string[];
}

/**
 * Check for duplicate advisor selections across different advisor types
 */
export const useDuplicateAdvisorCheck = (
  selections: Record<string, string[]>, // advisorType -> advisorIds[]
  advisorNames?: Record<string, string> // advisorId -> name mapping
): DuplicateCheck => {
  const { toast } = useToast();

  const duplicateCheck = useMemo(() => {
    const advisorTypeMap = new Map<string, string[]>(); // advisorId -> [types]
    const warnings: string[] = [];

    // Build map of advisor to types they're selected for
    Object.entries(selections).forEach(([type, advisorIds]) => {
      advisorIds.forEach(advisorId => {
        const existing = advisorTypeMap.get(advisorId) || [];
        existing.push(type);
        advisorTypeMap.set(advisorId, existing);
      });
    });

    // Find duplicates (advisor selected for multiple types)
    const duplicates = Array.from(advisorTypeMap.entries())
      .filter(([_, types]) => types.length > 1)
      .map(([advisorId, types]) => {
        const advisorName = advisorNames?.[advisorId] || advisorId;
        const warning = `${advisorName} נבחר עבור ${types.length} תפקידים: ${types.join(', ')}`;
        warnings.push(warning);
        
        return {
          advisorId,
          advisorName,
          types,
          count: types.length
        };
      });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
      warnings
    };
  }, [selections, advisorNames]);

  // Show toast warning when duplicates are detected
  useMemo(() => {
    if (duplicateCheck.hasDuplicates && duplicateCheck.warnings.length > 0) {
      toast({
        title: '⚠️ שים לב: יועצים כפולים',
        description: duplicateCheck.warnings.join('\n'),
        variant: 'default',
        duration: 8000,
      });
    }
  }, [duplicateCheck.hasDuplicates, duplicateCheck.warnings, toast]);

  return duplicateCheck;
};

/**
 * Validate that advisor selections don't conflict with already engaged advisors
 */
export const useEngagedAdvisorCheck = (
  selectedAdvisors: Record<string, string[]>,
  engagedAdvisors: Array<{ advisor_id: string; advisor_type: string; advisor_name?: string }>
): { hasConflicts: boolean; conflicts: string[] } => {
  const { toast } = useToast();

  const conflictCheck = useMemo(() => {
    const conflicts: string[] = [];

    // Check if any selected advisor is already engaged for this project
    Object.entries(selectedAdvisors).forEach(([type, advisorIds]) => {
      advisorIds.forEach(advisorId => {
        const alreadyEngaged = engagedAdvisors.find(
          engaged => engaged.advisor_id === advisorId
        );
        
        if (alreadyEngaged) {
          const advisorName = alreadyEngaged.advisor_name || advisorId;
          const message = alreadyEngaged.advisor_type === type
            ? `${advisorName} כבר נבחר כ-${type} בפרויקט זה`
            : `${advisorName} כבר נבחר כ-${alreadyEngaged.advisor_type}, אתה מנסה לבחור אותו גם כ-${type}`;
          conflicts.push(message);
        }
      });
    });

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }, [selectedAdvisors, engagedAdvisors]);

  // Show error toast when conflicts are detected
  useMemo(() => {
    if (conflictCheck.hasConflicts && conflictCheck.conflicts.length > 0) {
      toast({
        title: '❌ שגיאה: יועצים שכבר נבחרו',
        description: conflictCheck.conflicts.join('\n'),
        variant: 'destructive',
        duration: 10000,
      });
    }
  }, [conflictCheck.hasConflicts, conflictCheck.conflicts, toast]);

  return conflictCheck;
};
