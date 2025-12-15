// Helper functions for MVP
function calculateYearsExperience(advisor: { founding_year: number | null }): number {
  if (!advisor.founding_year) return 0;
  return Math.max(0, new Date().getFullYear() - advisor.founding_year);
}

function extractScopeFromDescription(description: string | null, projectType: string | null): string[] {
  if (!description && !projectType) return ["General"];
  
  // Simple extraction: look for common scope keywords
  const scopeKeywords = [
    "Permitting", "Design", "Supervision", "Planning", "Engineering",
    "Legal", "Architecture", "Construction", "Management", "Consulting",
    "Inspection", "Surveying", "Appraisal", "Coordination"
  ];
  
  const found: string[] = [];
  const text = (description || "").toLowerCase();
  
  scopeKeywords.forEach(keyword => {
    if (text.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  });
  
  // Fallback to project type if no keywords found
  return found.length > 0 ? found : [projectType || "General"];
}

interface ProposalData {
  proposal_id: string;
  vendor_name: string;
  extracted_text: string;
  scope_text: string | null;
  price_quoted: number;
  currency: string;
  timeline_days: number;
  terms: string | null;
  conditions_json: Record<string, any> | null;
  years_experience: number;
  db_internal_rating: number;
  expertise: string[];
  certifications: string[];
  company_name: string | null;
}

interface ProjectMetadata {
  project_id: string;
  project_type: string | null;
  location: string | null;
  budget: number | null;
  advisors_budget: number | null;
  units: number | null;
  description: string | null;
}

interface BenchmarkData {
  price_benchmark: number;
  timeline_benchmark_days: number;
}

export function buildUserContent(
  proposals: ProposalData[],
  project: ProjectMetadata,
  benchmark: BenchmarkData
): string {
  // Large scale works with just advisors_budget if units is NULL
  const isLargeScale = (project.units !== null && project.units > 40) || 
                       (project.advisors_budget !== null && project.advisors_budget > 1000000);

  // Extract required_scope from description
  const required_scope = extractScopeFromDescription(project.description, project.project_type);

  const userContent = {
    project_metadata: {
      project_id: project.project_id,
      project_type: project.project_type || "Unknown",
      location: project.location || "Unknown",
      budget: project.budget,
      advisors_budget: project.advisors_budget,
      units: project.units, // May be NULL
      is_large_scale: isLargeScale,
      required_scope: required_scope
    },
    benchmark_data: {
      price_benchmark: benchmark.price_benchmark,
      timeline_benchmark_days: benchmark.timeline_benchmark_days
    },
    proposals: proposals.map(p => ({
      proposal_id: p.proposal_id,
      vendor_name: p.vendor_name,
      company_name: p.company_name,
      extracted_text: p.extracted_text || p.scope_text || "", // Fallback to scope_text if no extraction
      price_quoted: p.price_quoted,
      currency: p.currency || "ILS",
      timeline_days: p.timeline_days,
      terms: p.terms || "",
      conditions: p.conditions_json || {},
      years_experience: p.years_experience, // Already calculated from founding_year
      db_internal_rating: p.db_internal_rating, // From advisors.rating (MVP)
      expertise: p.expertise || [],
      certifications: p.certifications || []
    }))
  };

  return JSON.stringify(userContent, null, 2);
}


