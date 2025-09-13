import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectAdvisorData {
  Project: string;
  Advisors: string[];
}

interface AdvisorsData {
  required_categories: string[];
  projects: ProjectAdvisorData[];
}

interface ValidationResult {
  Project: string;
  Status: 'All Advisors Present' | 'Missing Advisors' | 'Unknown Project Type' | 'Data Source Error';
  RequiredCount: number;
  SelectedCount: number;
  Missing: string[];
  RecommendedBaseline?: string[];
  ValidProjectTypes?: string[];
  Notes: string;
}

const CACHE_KEY = 'advisors-data-cache';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

export const useAdvisorsValidation = () => {
  const [data, setData] = useState<AdvisorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setData(cachedData);
            setLoading(false);
            return;
          }
        }

        // Fetch from Supabase Edge Function
        const { data: response, error } = await supabase.functions.invoke('get-advisors-data');
        
        if (error) {
          throw new Error(`Failed to fetch advisors data: ${error.message}`);
        }

        const jsonData = response;
        setData(jsonData);
        
        // Cache the data
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: jsonData,
          timestamp: Date.now()
        }));

      } catch (err) {
        console.error('Error fetching advisors data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load advisors data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const normalize = (str: string): string => {
    if (!str) return '';
    let trimmed = str.trim();
    // Remove leading checkbox symbols
    trimmed = trimmed.replace(/^[☐✔✅]\s*/, '');
    return trimmed.trim();
  };

  const getCanonicalProjectTypes = (): string[] => {
    if (!data) return [];
    
    // Normalize and deduplicate project types
    const normalizedTypes = new Set(
      data.projects.map(p => normalize(p.Project)).filter(Boolean)
    );
    
    // Sort by Hebrew alphabetical order
    return Array.from(normalizedTypes).sort((a, b) => 
      a.localeCompare(b, 'he', { sensitivity: 'base' })
    );
  };

  const validateAdvisorSelection = (
    incomingProjectName: string,
    selectedAdvisors: string[]
  ): ValidationResult => {
    if (!data) {
      return {
        Project: incomingProjectName,
        Status: 'Data Source Error',
        RequiredCount: 0,
        SelectedCount: selectedAdvisors.length,
        Missing: [],
        Notes: 'לא ניתן לטעון נתוני יועצים. נסה שוב מאוחר יותר.'
      };
    }

    const normalizedProjectName = normalize(incomingProjectName);
    const canonicalProjects = new Map(
      data.projects.map(p => [normalize(p.Project), p.Advisors])
    );

    // Check if project type is known
    if (!canonicalProjects.has(normalizedProjectName)) {
      return {
        Project: normalizedProjectName,
        Status: 'Unknown Project Type',
        RequiredCount: data.required_categories.length,
        SelectedCount: selectedAdvisors.length,
        Missing: data.required_categories,
        ValidProjectTypes: getCanonicalProjectTypes(),
        Notes: 'סוג הפרויקט לא מזוהה. בחר שם מדויק מהרשימה.'
      };
    }

    // Normalize selected advisors
    const normalizedSelected = new Set(
      selectedAdvisors.map(advisor => normalize(advisor))
    );

    const requiredSet = new Set(data.required_categories);
    const missing = data.required_categories.filter(req => !normalizedSelected.has(req));

    const status = missing.length === 0 ? 'All Advisors Present' : 'Missing Advisors';
    const notes = status === 'Missing Advisors' 
      ? 'חסרים יועצים נדרשים. השלם כדי לאשר RFP.'
      : 'כל היועצים הנדרשים סומנו. אפשר להמשיך ל-RFP.';

    return {
      Project: normalizedProjectName,
      Status: status,
      RequiredCount: requiredSet.size,
      SelectedCount: normalizedSelected.size,
      Missing: missing.sort(),
      RecommendedBaseline: canonicalProjects.get(normalizedProjectName)?.sort(),
      Notes: notes
    };
  };

  const getRecommendedAdvisors = (projectType: string): string[] => {
    if (!data) return [];
    const normalizedProjectType = normalize(projectType);
    const project = data.projects.find(p => normalize(p.Project) === normalizedProjectType);
    return project ? project.Advisors.sort() : [];
  };

  return {
    data,
    loading,
    error,
    validateAdvisorSelection,
    getCanonicalProjectTypes,
    getRecommendedAdvisors,
    normalize
  };
};