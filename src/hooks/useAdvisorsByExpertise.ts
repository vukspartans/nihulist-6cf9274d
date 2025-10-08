import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAdvisorsValidation } from './useAdvisorsValidation';

export interface AdvisorData {
  id: string;
  company_name: string | null;
  location: string | null;
  expertise: string[];
  years_experience: number | null;
  rating: number | null;
  office_size: string | null;
  website: string | null;
  activity_regions: string[];
}

export interface AdvisorsByType {
  [expertiseType: string]: AdvisorData[];
}

export interface AdvisorTypeMetadata {
  type: string;
  priority: 'critical' | 'recommended' | 'optional';
  advisors: AdvisorData[];
}

export const useAdvisorsByExpertise = (
  projectType: string,
  selectedAdvisorTypes: string[],
  projectLocation?: string
) => {
  const [advisors, setAdvisors] = useState<AdvisorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { getRecommendedAdvisors } = useAdvisorsValidation();

  useEffect(() => {
    const fetchAdvisors = async () => {
      if (selectedAdvisorTypes.length === 0) {
        setAdvisors([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('advisors')
          .select('id, company_name, location, expertise, years_experience, rating, office_size, website, activity_regions')
          .eq('is_active', true);

        if (fetchError) throw fetchError;

        setAdvisors(data || []);
      } catch (err) {
        console.error('Error fetching advisors:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch advisors');
      } finally {
        setLoading(false);
      }
    };

    fetchAdvisors();
  }, [selectedAdvisorTypes]);

  // Sort advisors by relevance within their type
  const sortAdvisorsByRelevance = (
    advisorsList: AdvisorData[],
    projectLocation?: string
  ): AdvisorData[] => {
    return [...advisorsList].sort((a, b) => {
      // 1. Location match (highest priority)
      const aLocationMatch = a.location === projectLocation;
      const bLocationMatch = b.location === projectLocation;
      if (aLocationMatch && !bLocationMatch) return -1;
      if (!aLocationMatch && bLocationMatch) return 1;

      // 2. Activity regions match
      const aRegionMatch = projectLocation && a.activity_regions?.some(region => 
        region.includes(projectLocation) || projectLocation.includes(region)
      );
      const bRegionMatch = projectLocation && b.activity_regions?.some(region => 
        region.includes(projectLocation) || projectLocation.includes(region)
      );
      if (aRegionMatch && !bRegionMatch) return -1;
      if (!aRegionMatch && bRegionMatch) return 1;

      // 3. Rating (higher is better)
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      if (aRating !== bRating) return bRating - aRating;

      // 4. Experience (more years is better)
      const aExp = a.years_experience || 0;
      const bExp = b.years_experience || 0;
      if (aExp !== bExp) return bExp - aExp;

      return 0;
    });
  };

  // Group advisors by expertise type
  const advisorsByType: AdvisorsByType = useMemo(() => {
    const grouped: AdvisorsByType = {};

    selectedAdvisorTypes.forEach(type => {
      const matchingAdvisors = advisors.filter(advisor => 
        advisor.expertise?.includes(type)
      );
      grouped[type] = sortAdvisorsByRelevance(matchingAdvisors, projectLocation);
    });

    return grouped;
  }, [advisors, selectedAdvisorTypes, projectLocation]);

  // Categorize and sort advisor types by priority
  const sortedAdvisorTypes: AdvisorTypeMetadata[] = useMemo(() => {
    const recommendedAdvisors = getRecommendedAdvisors(projectType);
    
    return selectedAdvisorTypes.map(type => {
      const isRequired = recommendedAdvisors.includes(type);
      const advisorsForType = advisorsByType[type] || [];
      
      return {
        type,
        priority: (isRequired ? 'critical' : 'recommended') as 'critical' | 'recommended' | 'optional',
        advisors: advisorsForType
      };
    }).sort((a, b) => {
      // Sort by priority first (critical > recommended > optional)
      const priorityOrder = { critical: 0, recommended: 1, optional: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then alphabetically within same priority
      return a.type.localeCompare(b.type, 'he');
    });
  }, [selectedAdvisorTypes, advisorsByType, projectType, getRecommendedAdvisors]);

  return {
    advisorsByType,
    sortedAdvisorTypes,
    loading,
    error,
    totalAdvisors: advisors.length
  };
};
