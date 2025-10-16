import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { canonicalizeAdvisor } from '@/lib/canonicalizeAdvisor';

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
const CACHE_VERSION = '3'; // Increment when canonical data changes

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
          const { data: cachedData, timestamp, version } = JSON.parse(cached);
          // Use cache only if version matches and not expired
          if (version === CACHE_VERSION && Date.now() - timestamp < CACHE_DURATION) {
            setData(cachedData);
            setLoading(false);
            return;
          }
          // Clear cache if version mismatch
          if (version !== CACHE_VERSION) {
            console.log('[useAdvisorsValidation] Cache version mismatch, clearing cache');
            localStorage.removeItem(CACHE_KEY);
          }
        }

        // Fetch from Supabase Edge Function
        const { data: response, error } = await supabase.functions.invoke('get-advisors-data');
        
        if (error) {
          throw new Error(`Failed to fetch advisors data: ${error.message}`);
        }

        const jsonData = response;
        setData(jsonData);
        
        // Cache the data with version
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: jsonData,
          timestamp: Date.now(),
          version: CACHE_VERSION
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

  // Legacy type mapping for backward compatibility
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
    if (type.includes('בריכ')) {
      return 'מתקני ספורט ונופש';
    }
    if (type.includes('בית ספר') || type.includes('חינוך')) {
      return 'בית ספר';
    }
    if (type.includes('בית חולים') || type.includes('רפוא')) {
      return 'בית חולים';
    }
    if (type.includes('מלון')) {
      return 'מלון';
    }
    if (type.includes('קניון') || type.includes('מסחר')) {
      return 'מרכז מסחרי / קניון';
    }
    
    // Return original if no mapping found
    return type;
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

    // First try to normalize legacy project type
    const legacyNormalizedType = normalizeLegacyProjectType(incomingProjectName);
    const normalizedProjectName = normalize(legacyNormalizedType);
    
    const canonicalProjects = new Map(
      data.projects.map(p => [normalize(p.Project), p.Advisors])
    );

    // Check if project type is known (after legacy normalization)
    if (!canonicalProjects.has(normalizedProjectName)) {
      // Try with original normalized name as fallback
      const originalNormalized = normalize(incomingProjectName);
      if (!canonicalProjects.has(originalNormalized)) {
        return {
          Project: incomingProjectName,
          Status: 'Unknown Project Type',
          RequiredCount: data.required_categories.length,
          SelectedCount: selectedAdvisors.length,
          Missing: data.required_categories,
          ValidProjectTypes: getCanonicalProjectTypes(),
          Notes: 'סוג הפרויקט לא מזוהה. בחר שם מדויק מהרשימה או עדכן את סוג הפרויקט.'
        };
      }
      // Use original normalized name if found
      const normalizedProjectName = originalNormalized;
    }

    // Get project-specific required advisors and canonicalize them
    const projectAdvisors = (canonicalProjects.get(normalizedProjectName) || []).map(canonicalizeAdvisor);
    
    // Canonicalize selected advisors for comparison
    const canonicalSelected = new Set(
      selectedAdvisors.map(advisor => canonicalizeAdvisor(advisor))
    );

    const requiredSet = new Set(projectAdvisors);
    const missing = projectAdvisors.filter(req => !canonicalSelected.has(req));

    const status = missing.length === 0 ? 'All Advisors Present' : 'Missing Advisors';
    const notes = status === 'Missing Advisors' 
      ? 'חסרים יועצים נדרשים. השלם כדי לאשר הצעות מחיר.'
      : 'כל היועצים הנדרשים סומנו. אפשר להמשיך להצעות מחיר.';

    return {
      Project: normalizedProjectName,
      Status: status,
      RequiredCount: requiredSet.size,
      SelectedCount: canonicalSelected.size,
      Missing: missing.sort(),
      RecommendedBaseline: canonicalProjects.get(normalizedProjectName)?.map(canonicalizeAdvisor).sort(),
      Notes: notes
    };
  };

  const getRecommendedAdvisors = (projectType: string): string[] => {
    if (!data) return [];
    
    // Try legacy normalization first, then regular normalization
    const legacyNormalized = normalizeLegacyProjectType(projectType);
    const normalizedProjectType = normalize(legacyNormalized);
    
    let project = data.projects.find(p => normalize(p.Project) === normalizedProjectType);
    
    // Fallback to original normalization if not found
    if (!project) {
      const originalNormalized = normalize(projectType);
      project = data.projects.find(p => normalize(p.Project) === originalNormalized);
    }
    
    // Canonicalize all advisor names before returning
    return project ? Array.from(new Set(project.Advisors.map(canonicalizeAdvisor))).sort() : [];
  };

  return {
    data,
    loading,
    error,
    validateAdvisorSelection,
    getCanonicalProjectTypes,
    getRecommendedAdvisors,
    normalize,
    normalizeLegacyProjectType
  };
};