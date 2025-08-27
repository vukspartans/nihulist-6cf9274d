import { useState, useEffect } from 'react';

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

const JSON_URL = 'https://aazakceyruefejeyhkbk.supabase.co/storage/v1/object/sign/json/advisors_projects_full.json?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82NzdhYzgzYy04Yjk0LTQ5NzQtYWE5My1jMzY2MmE5ODJhNTUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJqc29uL2Fkdmlzb3JzX3Byb2plY3RzX2Z1bGwuanNvbiIsImlhdCI6MTc1NTgwNjExMiwiZXhwIjoxNzU2NDEwOTEyfQ.peFOxV33sTpkmrZO4n-UAYKFZlYw6OmsPBx5JI6ff8Y';

export const useAdvisorsValidation = () => {
  const [data, setData] = useState<AdvisorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(JSON_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch advisors data');
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
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