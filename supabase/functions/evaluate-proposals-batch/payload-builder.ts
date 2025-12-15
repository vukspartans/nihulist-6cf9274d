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
  // RFP invite data (may be null if proposal wasn't from RFP)
  rfp_request_title?: string | null;
  rfp_request_content?: string | null;
  rfp_advisor_type?: string | null;
}

interface ProjectMetadata {
  project_id: string;
  project_type: string | null;
  location: string | null;
  budget: number | null;
  advisors_budget: number | null;
  units: number | null;
  description: string | null;
  phase?: string | null;
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

  // Determine evaluation mode
  const evaluationMode = proposals.length === 1 ? "SINGLE" : "BATCH";

  // Get RFP requirements (use first proposal's RFP data, or aggregate if different)
  // In practice, all proposals for same project should have same RFP requirements
  const firstProposal = proposals[0];
  const rfpRequirements = {
    request_title: firstProposal.rfp_request_title || null,
    request_content: firstProposal.rfp_request_content || null,
    advisor_type: firstProposal.rfp_advisor_type || null
  };

  const userContent = {
    evaluation_mode: evaluationMode,
    project_metadata: {
      project_id: project.project_id,
      project_name: project.project_id, // Will be replaced with actual name in index.ts if available
      project_type: project.project_type || "Unknown",
      location: project.location || "Unknown",
      phase: project.phase || null,
      budget: project.budget,
      advisors_budget: project.advisors_budget,
      units: project.units, // May be NULL
      description: project.description || null,
      is_large_scale: isLargeScale,
      required_scope: required_scope
    },
    rfp_requirements: rfpRequirements.request_title || rfpRequirements.request_content 
      ? rfpRequirements 
      : null, // Only include if RFP data exists
    benchmark_data: evaluationMode === "SINGLE" 
      ? null // No benchmark for single proposal
      : {
          price_benchmark: benchmark.price_benchmark,
          timeline_benchmark_days: benchmark.timeline_benchmark_days
        },
    proposals: proposals.map(p => {
      // Calculate data completeness score
      const hasPrice = p.price_quoted > 0;
      const hasTimeline = p.timeline_days > 0;
      const hasScope = (p.extracted_text || p.scope_text || "").trim().length > 50;
      const hasExperience = p.years_experience > 0;
      const hasRating = p.db_internal_rating > 0;
      const hasExpertise = p.expertise && p.expertise.length > 0;
      const hasTerms = (p.terms || "").trim().length > 0;
      
      const completenessScore = (
        (hasPrice ? 1 : 0) * 0.15 +
        (hasTimeline ? 1 : 0) * 0.10 +
        (hasScope ? 1 : 0) * 0.20 +
        (hasExperience ? 1 : 0) * 0.15 +
        (hasRating ? 1 : 0) * 0.15 +
        (hasExpertise ? 1 : 0) * 0.10 +
        (hasTerms ? 1 : 0) * 0.15
      );

      return {
        proposal_id: p.proposal_id,
        vendor_name: p.vendor_name,
        company_name: p.company_name,
        extracted_text: p.extracted_text || p.scope_text || "", // Fallback to scope_text if no extraction
        scope_text: p.scope_text || null,
        price_quoted: p.price_quoted,
        currency: p.currency || "ILS",
        timeline_days: p.timeline_days,
        terms: p.terms || null,
        conditions: p.conditions_json || {},
        years_experience: p.years_experience, // Already calculated from founding_year
        db_internal_rating: p.db_internal_rating, // From advisors.rating (MVP)
        expertise: p.expertise || [],
        certifications: p.certifications || [],
        data_completeness: Math.round(completenessScore * 100) / 100, // 0.0 to 1.0
        missing_data_flags: {
          no_price: !hasPrice,
          no_timeline: !hasTimeline,
          no_scope: !hasScope,
          no_experience: !hasExperience,
          no_rating: !hasRating,
          no_expertise: !hasExpertise,
          no_terms: !hasTerms
        }
      };
    })
  };

  return JSON.stringify(userContent, null, 2);
}


