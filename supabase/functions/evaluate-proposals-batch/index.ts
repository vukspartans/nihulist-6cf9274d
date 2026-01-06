/**
 * COMPLETE INDEX.TS FOR SUPABASE DASHBOARD
 * 
 * This is a single-file version that combines all dependencies.
 * Copy this entire file to replace index.ts in Supabase Dashboard.
 * 
 * IMPORTANT: You still need to create these separate files in Dashboard:
 * - google-ai-helper.ts
 * - schemas.ts
 * - prompts.ts
 * - payload-builder.ts
 * 
 * OR use this combined version if Dashboard doesn't support multiple files.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ============================================================================
// ZOD SCHEMA (from schemas.ts)
// ============================================================================

const EvaluationResultSchema = z.object({
  batch_summary: z.object({
    total_proposals: z.number().int().min(1),
    project_type_detected: z.enum(["STANDARD", "LARGE_SCALE"]),
    price_benchmark_used: z.number().positive().nullable(),
    evaluation_mode: z.enum(["SINGLE", "BATCH"]),
    market_context: z.string().optional(),
  }),
  ranked_proposals: z.array(
    z.object({
      proposal_id: z.string().uuid(),
      vendor_name: z.string().min(1),
      final_score: z.number().int().min(0).max(100),
      rank: z.number().int().min(1),
      data_completeness: z.number().min(0).max(1),
      recommendation_level: z.enum([
        "Highly Recommended",
        "Recommended",
        "Review Required",
        "Not Recommended",
      ]),
      individual_analysis: z.object({
        requirements_alignment: z.string(),
        price_assessment: z.string(),
        timeline_assessment: z.string(),
        experience_assessment: z.string(),
        scope_quality: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        missing_requirements: z.array(z.string()),
        extra_offerings: z.array(z.string()),
      }),
      flags: z.object({
        red_flags: z.array(z.string()),
        green_flags: z.array(z.string()),
        knockout_triggered: z.boolean(),
        knockout_reason: z.string().nullable(),
      }),
      comparative_notes: z.string().nullable(),
    })
  ).min(1),
});

type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

// ============================================================================
// SYSTEM INSTRUCTION (from prompts.ts)
// ============================================================================

const SYSTEM_INSTRUCTION = `
You are a senior procurement consultant with 20+ years of experience in real estate and construction projects in Israel.
Your expertise includes evaluating vendor proposals (architects, engineers, lawyers, contractors, consultants) for real estate development projects.

## YOUR ROLE
You provide objective, professional analysis that helps project owners make informed decisions.
You understand the Israeli construction market, local regulations, typical project phases, and industry standards.

## ANALYSIS APPROACH

### PHASE 1: PROJECT UNDERSTANDING
Before evaluating any proposals, you MUST fully understand:
1. **Project Context**: Type, location, scale, phase, budget constraints
2. **Original Requirements**: What was specifically requested in the RFP (request_title, request_content, advisor_type)
3. **Project Scope**: What services are needed based on project description and phase
4. **Market Context**: Typical pricing, timelines, and service standards for similar projects in Israel

### PHASE 2: INDIVIDUAL PROPOSAL ANALYSIS
For EACH proposal, analyze independently:

**A. Requirements Alignment**
- Does the proposal address ALL requirements from the RFP?
- Identify gaps: What was requested but NOT included?
- Identify extras: What was offered beyond requirements?

**B. Price Assessment**
- Is the price reasonable for the Israeli market?
- Compare to project budget and advisor budget constraints
- Flag suspiciously low prices (< 50% of benchmark) - may indicate missing scope
- Flag excessively high prices (> 140% of benchmark) - may indicate overpricing

**C. Timeline Evaluation**
- Is the timeline realistic for the scope?
- Consider project phase, complexity, and Israeli permit/approval processes
- Identify dependencies and risks

**D. Scope Quality**
- Does the proposal clearly define what's included?
- Are there concerning exclusions or assumptions?
- Is the scope text detailed enough or too vague?

**E. Professional Credibility**
- Years of experience relevant to project scale
- Expertise alignment with project type
- Certifications and credentials
- Historical performance (internal rating)

**F. Risk Identification**
Scan for RED FLAGS:
- "Not included", "Estimate only", "Price TBD", "Subject to availability"
- "No commitment to schedule", "Additional costs may apply"
- "Excludes", "Not responsible for", vague payment terms
- Missing mandatory certifications or licenses

Identify GREEN FLAGS:
- "Full coordination included", "Unlimited revisions"
- "Until permit obtained", "Full responsibility"
- "Fast response", "Complete scope", clear commitment

**G. Knockout Criteria**
Reject proposal if:
1. SCOPE_REFUSAL: Explicitly excludes core required services. 
   - When triggered, provide detailed reason: "Excludes [specific service] which is required for this project. The proposal explicitly states: '[quote from proposal]'"
2. CREDENTIALS_MISSING: Lacks mandatory licensing/certifications mentioned in requirements.
   - When triggered, provide detailed reason: "Missing required [license/certification type]. The project requires [specific requirement] but the vendor does not have this credential."
3. PAYMENT_TERMS_VIOLATION: Demands terms widely divergent from client request (e.g., 100% upfront when milestone-based requested).
   - When triggered, provide detailed reason: "Payment terms violate project requirements. Vendor demands [specific terms] but project requires [required terms]. This creates unacceptable financial risk."

IMPORTANT: When knockout_triggered is true, knockout_reason MUST be a detailed, human-readable explanation (2-3 sentences) that explains:
- What specific requirement was violated
- Why this is a problem for the project
- What the vendor should have done instead

### PHASE 3: SCORING (0-100)

Calculate weighted score for each non-rejected proposal:

**DEFAULT WEIGHTS:**
- Price: 20% (lower is better, but flag suspiciously low)
- Professional Experience: 30% (years, relevant projects, expertise match)
- Proposal Quality (Scope adherence): 13% (how well it matches requirements)
- Payment Terms: 12% (alignment with project needs)
- Internal System Rating (Historical performance): 20% (past project success)
- Team Fit/Collaboration: 5% (if unknown, redistribute to Quality/Terms)

**LARGE_SCALE ADJUSTMENT:**
IF project is LARGE_SCALE (units > 40 OR advisor_budget > 1,000,000 ILS):
- Increase Experience weight by +15% (Total: 45%)
- Reduce Price weight by -5% (Total: 15%)
- Redistribute remaining weights proportionally

**MISSING DATA HANDLING:**
- If data is missing (null, empty, or 0), reduce weight for that category
- Redistribute weight to categories with available data
- Add "data_completeness" flag (0-1) indicating confidence in score
- Lower completeness = lower confidence in final score

### PHASE 4: COMPARATIVE ANALYSIS (if multiple proposals)

ONLY if there are 2+ proposals:
- Rank proposals by final_score (1 = best)
- Compare relative strengths and weaknesses
- Identify best value (not necessarily lowest price)
- Note if single proposal would be evaluated differently

**SINGLE PROPOSAL HANDLING:**
If only 1 proposal:
- Evaluate against project requirements and market standards
- Use external benchmarks if provided, otherwise evaluate on absolute merit
- Do NOT create artificial comparison
- Provide detailed individual analysis

### PHASE 5: RECOMMENDATION LEVEL

Assign recommendation based on score and analysis:
- **Highly Recommended** (80-100): Strong match, good value, low risk
- **Recommended** (60-79): Good match with minor concerns, acceptable value
- **Review Required** (40-59): Significant gaps or concerns, needs negotiation
- **Not Recommended** (< 40): Major issues, high risk, or knockout criteria triggered

## OUTPUT FORMAT

Return ONLY valid JSON. No markdown, no code blocks, no explanations.

JSON Schema:
{
  "batch_summary": {
    "total_proposals": Integer,
    "project_type_detected": "STANDARD" | "LARGE_SCALE",
    "price_benchmark_used": Float | null,
    "evaluation_mode": "SINGLE" | "BATCH",
    "market_context": "String (brief note about Israeli market context)"
  },
  "ranked_proposals": [
    {
      "proposal_id": "String (UUID)",
      "vendor_name": "String",
      "final_score": Integer (0-100),
      "rank": Integer (1 = best, or 1 if single),
      "data_completeness": Float (0.0-1.0, confidence in score based on available data),
      "recommendation_level": "Highly Recommended" | "Recommended" | "Review Required" | "Not Recommended",
      "individual_analysis": {
        "requirements_alignment": "String (detailed assessment)",
        "price_assessment": "String (e.g., '15% below market average, reasonable for scope')",
        "timeline_assessment": "String (e.g., 'Realistic timeline considering permit process')",
        "experience_assessment": "String (e.g., '20 years experience, matches Large Scale requirements')",
        "scope_quality": "String (detailed assessment of proposal scope)",
        "strengths": ["String"],
        "weaknesses": ["String"],
        "missing_requirements": ["String (what was requested but not included)"],
        "extra_offerings": ["String (what was offered beyond requirements)"]
      },
      "flags": {
        "red_flags": ["String"],
        "green_flags": ["String"],
        "knockout_triggered": Boolean,
        "knockout_reason": "String or null"
      },
      "comparative_notes": "String or null (only if batch mode, how this compares to others)"
    }
  ]
}

## CRITICAL RULES

1. **Project Understanding First**: Always analyze project context before proposals
2. **Individual Analysis**: Evaluate each proposal independently before comparing
3. **Missing Data**: Explicitly handle missing data, don't assume defaults
4. **Single Proposal**: Provide full analysis even without comparison
5. **Market Context**: Consider Israeli construction market realities
6. **RFP Requirements**: Always reference original RFP request_title and request_content
7. **Output**: ONLY valid JSON, no markdown formatting

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.
`;

// ============================================================================
// PAYLOAD BUILDER (from payload-builder.ts)
// ============================================================================

function extractScopeFromDescription(description: string | null, projectType: string | null): string[] {
  if (!description && !projectType) return ["General"];
  
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

function buildUserContent(
  proposals: ProposalData[],
  project: ProjectMetadata,
  benchmark: BenchmarkData
): string {
  const isLargeScale = (project.units !== null && project.units > 40) || 
                       (project.advisors_budget !== null && project.advisors_budget > 1000000);

  const required_scope = extractScopeFromDescription(project.description, project.project_type);
  const evaluationMode = proposals.length === 1 ? "SINGLE" : "BATCH";

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
      project_name: project.project_id,
      project_type: project.project_type || "Unknown",
      location: project.location || "Unknown",
      phase: project.phase || null,
      budget: project.budget,
      advisors_budget: project.advisors_budget,
      units: project.units,
      description: project.description || null,
      is_large_scale: isLargeScale,
      required_scope: required_scope
    },
    rfp_requirements: rfpRequirements.request_title || rfpRequirements.request_content 
      ? rfpRequirements 
      : null,
    benchmark_data: evaluationMode === "SINGLE" 
      ? null
      : {
          price_benchmark: benchmark.price_benchmark,
          timeline_benchmark_days: benchmark.timeline_benchmark_days
        },
    proposals: proposals.map(p => {
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
        extracted_text: p.extracted_text || p.scope_text || "",
        scope_text: p.scope_text || null,
        price_quoted: p.price_quoted,
        currency: p.currency || "ILS",
        timeline_days: p.timeline_days,
        terms: p.terms || null,
        conditions: p.conditions_json || {},
        years_experience: p.years_experience,
        db_internal_rating: p.db_internal_rating,
        expertise: p.expertise || [],
        certifications: p.certifications || [],
        data_completeness: Math.round(completenessScore * 100) / 100,
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

// ============================================================================
// OPENAI HELPER
// ============================================================================

async function callOpenAI(
  systemInstruction: string,
  userContent: string,
  apiKey: string,
  vendorNameMap: Map<string, string>
): Promise<EvaluationResult> {
  // Model selection for batch processing (fastest to slowest):
  // - gpt-3.5-turbo: FASTEST (~10-15s for 5 proposals), lower quality
  // - gpt-4o-mini: FAST (~30-40s for 5 proposals), good quality/price balance
  // - gpt-4o: MEDIUM (~20-30s for 5 proposals), best quality, faster than mini for complex tasks
  // - gpt-4-turbo: SLOWER (~40-50s), highest quality
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o';
  
  const aiEndpoint = 'https://api.openai.com/v1/chat/completions';
  
  console.log('[Evaluate] Using OpenAI API');
  console.log('[Evaluate] Model:', model);
  console.log('[Evaluate] Endpoint:', aiEndpoint);
  
  // OpenAI API format with JSON mode
  const payload = {
    model: model,
    messages: [
      {
        role: "system",
        content: systemInstruction
      },
      {
        role: "user",
        content: userContent
      }
    ],
    temperature: 0.0, // Deterministic output
    response_format: { type: "json_object" }, // Force JSON output
    max_tokens: 8192
  };

  console.log('[Evaluate] Calling OpenAI API...');
  
  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Evaluate] OpenAI API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log('[Evaluate] OpenAI response received');

  // Extract JSON from OpenAI response
  const jsonText = result.choices?.[0]?.message?.content;
  
  if (!jsonText) {
    console.error('[Evaluate] No content in OpenAI response:', JSON.stringify(result).substring(0, 500));
    throw new Error('No content in AI response. Check API response format.');
  }

  // Clean JSON (remove markdown code blocks if present - though OpenAI with json_object shouldn't return these)
  let cleanedJson = jsonText.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Parse and validate JSON
  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (error) {
    console.error('[Evaluate] Invalid JSON:', cleanedJson.substring(0, 500));
    throw new Error(`Invalid JSON response from AI: ${error.message}`);
  }

  // Inject vendor_name from our source data (AI may return empty strings)
  if (parsed.ranked_proposals && Array.isArray(parsed.ranked_proposals)) {
    for (const proposal of parsed.ranked_proposals) {
      const vendorName = vendorNameMap.get(proposal.proposal_id);
      if (vendorName) {
        proposal.vendor_name = vendorName;
      } else if (!proposal.vendor_name || proposal.vendor_name.trim() === '') {
        proposal.vendor_name = 'Unknown Vendor';
      }
    }
  }

  // Validate with Zod
  const validated = EvaluationResultSchema.parse(parsed);
  return validated;
}

// ============================================================================
// GOOGLE AI STUDIO HELPER (from google-ai-helper.ts)
// ============================================================================

async function callGoogleAIStudio(
  systemInstruction: string,
  userContent: string,
  apiKey: string,
  vendorNameMap: Map<string, string>
): Promise<EvaluationResult> {
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash-002';
  
  console.log('[Evaluate] Using Google AI Studio API');
  console.log('[Evaluate] Model:', model);
  
  // Use v1 for gemini-1.5 models, v1beta for gemini-3 models
  const apiVersion = model.includes('gemini-3') ? 'v1beta' : 'v1';
  const aiEndpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;
  
  console.log('[Evaluate] Endpoint:', aiEndpoint);
  
  // responseMimeType is only supported in v1beta, not in v1
  const generationConfig: any = {
    temperature: 0.0,
    topK: 1,
    topP: 0.95,
    maxOutputTokens: 8192,
  };
  
  // Only add responseMimeType for v1beta API
  if (apiVersion === 'v1beta') {
    generationConfig.responseMimeType = "application/json";
  }
  
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${systemInstruction}\n\n${userContent}`
          }
        ]
      }
    ],
    generationConfig: generationConfig
  };

  console.log('[Evaluate] Calling Google AI Studio API...');
  
  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Evaluate] Google AI Studio API error:', response.status, errorText);
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  console.log('[Evaluate] Google AI Studio response received');

  const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!jsonText) {
    console.error('[Evaluate] No content in Google AI Studio response:', JSON.stringify(result).substring(0, 500));
    throw new Error('No content in AI response. Check API response format.');
  }

  let cleanedJson = jsonText.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (error) {
    console.error('[Evaluate] Invalid JSON:', cleanedJson.substring(0, 500));
    throw new Error(`Invalid JSON response from AI: ${error.message}`);
  }

  // Inject vendor_name from our source data (AI may return empty strings)
  if (parsed.ranked_proposals && Array.isArray(parsed.ranked_proposals)) {
    for (const proposal of parsed.ranked_proposals) {
      const vendorName = vendorNameMap.get(proposal.proposal_id);
      if (vendorName) {
        proposal.vendor_name = vendorName;
      } else if (!proposal.vendor_name || proposal.vendor_name.trim() === '') {
        proposal.vendor_name = 'Unknown Vendor';
      }
    }
  }

  const validated = EvaluationResultSchema.parse(parsed);
  return validated;
}

// ============================================================================
// MAIN FUNCTION (from index.ts)
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVALUATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface EvaluateRequest {
  project_id: string;
  proposal_ids?: string[];
  benchmark_data?: {
    price_benchmark: number;
    timeline_benchmark_days: number;
  };
  force_reevaluate?: boolean;
}

function calculateYearsExperience(advisor: { founding_year: number | null }): number {
  if (!advisor.founding_year) return 0;
  return Math.max(0, new Date().getFullYear() - advisor.founding_year);
}

function getGoogleAPIKey(): string {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMENI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMENI_API_KEY environment variable is not set. Please configure Google AI Studio API key.');
  }
  
  return apiKey;
}

function getOpenAIAPIKey(): string {
  const apiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPENAI_KEY');
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Please configure OpenAI API key.');
  }
  
  return apiKey;
}

// Determine which AI provider to use
function getAIProvider(): 'openai' | 'google' {
  // Check explicit provider setting
  const explicitProvider = Deno.env.get('AI_PROVIDER')?.toLowerCase();
  if (explicitProvider === 'openai' || explicitProvider === 'google') {
    return explicitProvider as 'openai' | 'google';
  }
  
  // Auto-detect based on available API keys
  const hasOpenAI = !!(Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPENAI_KEY'));
  const hasGoogle = !!(Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMENI_API_KEY'));
  
  // Prefer OpenAI if both are available (faster for batch processing)
  if (hasOpenAI) return 'openai';
  if (hasGoogle) return 'google';
  
  // Default to Google if neither is explicitly set (backward compatibility)
  return 'google';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { project_id, proposal_ids, benchmark_data, force_reevaluate = false }: EvaluateRequest = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'project_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Evaluate] Starting batch evaluation for project: ${project_id}`);

    // Determine AI provider
    const aiProvider = getAIProvider();
    console.log(`[Evaluate] Using AI provider: ${aiProvider}`);

    let apiKey: string;
    try {
      if (aiProvider === 'openai') {
        apiKey = getOpenAIAPIKey();
      } else {
        apiKey = getGoogleAPIKey();
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : `Failed to load ${aiProvider === 'openai' ? 'OpenAI' : 'Google AI Studio'} API key`,
          error_code: 'CONFIGURATION_ERROR',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, type, location, budget, advisors_budget, units, description, is_large_scale, phase')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let proposalsQuery = supabase
      .from('proposals')
      .select(`
        id,
        supplier_name,
        price,
        currency,
        timeline_days,
        scope_text,
        terms,
        conditions_json,
        extracted_text,
        files,
        advisor_id,
        advisors!fk_proposals_advisor(
          id,
          company_name,
          rating,
          expertise,
          certifications,
          founding_year
        )
      `)
      .eq('project_id', project_id)
      .in('status', ['submitted', 'resubmitted']);

    if (proposal_ids && proposal_ids.length > 0) {
      proposalsQuery = proposalsQuery.in('id', proposal_ids);
    }

    const { data: proposals, error: proposalsError } = await proposalsQuery;

    if (proposalsError) {
      console.error('[Evaluate] Error fetching proposals:', proposalsError);
      throw new Error(`Failed to fetch proposals: ${proposalsError.message}`);
    }

    if (!proposals || proposals.length === 0) {
      console.error('[Evaluate] No proposals found for project:', project_id);
      return new Response(
        JSON.stringify({ success: false, error: 'No proposals found for evaluation' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Evaluate] Found ${proposals.length} proposals to evaluate`);
    
    if (!force_reevaluate) {
      const proposalIds = proposals.map(p => p.id);
      const { data: existingEvaluations } = await supabase
        .from('proposals')
        .select('id, evaluation_status, evaluation_result, evaluation_score, evaluation_rank')
        .in('id', proposalIds)
        .eq('evaluation_status', 'completed');
      
      if (existingEvaluations && existingEvaluations.length === proposals.length) {
        console.log('[Evaluate] All proposals already evaluated, returning cached results');
        
        const rankedProposals = existingEvaluations
          .map(e => ({
            proposal_id: e.id,
            ...(e.evaluation_result as any),
            final_score: e.evaluation_score,
            rank: e.evaluation_rank
          }))
          .sort((a, b) => (a.rank || 0) - (b.rank || 0));
        
        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            project_id,
            batch_summary: {
              total_proposals: proposals.length,
              evaluation_mode: proposals.length === 1 ? 'SINGLE' : 'BATCH',
              price_benchmark_used: null,
              market_context: 'Using cached evaluation results'
            },
            ranked_proposals: rankedProposals,
            evaluation_metadata: {
              cached: true,
              note: 'These are cached results from a previous evaluation. Set force_reevaluate=true to re-run evaluation.'
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    proposals.sort((a, b) => a.id.localeCompare(b.id));
    console.log('[Evaluate] Proposals sorted deterministically by ID');
    
    for (const proposal of proposals) {
      if (!proposal.advisors || !proposal.advisor_id) {
        console.error('[Evaluate] Proposal missing advisor:', proposal.id);
        throw new Error(`Proposal ${proposal.id} is missing advisor information`);
      }
    }

    const advisorIds = proposals.map(p => p.advisor_id).filter(Boolean);
    let rfpInvitesMap = new Map<string, { request_title: string | null; request_content: string | null; advisor_type: string | null }>();
    
    if (advisorIds.length > 0) {
      const { data: rfps, error: rfpsError } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', project_id);
      
      if (!rfpsError && rfps && rfps.length > 0) {
        const rfpIds = rfps.map(r => r.id);
        
        const { data: invites, error: invitesError } = await supabase
          .from('rfp_invites')
          .select('advisor_id, request_title, request_content, advisor_type')
          .in('rfp_id', rfpIds)
          .in('advisor_id', advisorIds);
        
        if (!invitesError && invites) {
          for (const invite of invites) {
            if (invite.advisor_id) {
              rfpInvitesMap.set(invite.advisor_id, {
                request_title: invite.request_title || null,
                request_content: invite.request_content || null,
                advisor_type: invite.advisor_type || null
              });
            }
          }
        }
      }
    }
    
    console.log(`[Evaluate] Found RFP invite data for ${rfpInvitesMap.size} proposals`);

    for (const proposal of proposals) {
      if (!proposal.extracted_text || proposal.extracted_text.trim().length < 50) {
        console.log(`[Evaluate] Extracting text for proposal ${proposal.id}`);
        
        const extractResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-proposal-text`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ proposal_id: proposal.id }),
          }
        );

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          proposal.extracted_text = extractResult.extracted_text || proposal.scope_text || '';
        } else {
          proposal.extracted_text = proposal.scope_text || '';
        }
      }
    }

    let benchmark: { price_benchmark: number; timeline_benchmark_days: number };
    if (benchmark_data) {
      benchmark = benchmark_data;
    } else {
      const avgPrice = proposals.reduce((sum, p) => sum + Number(p.price), 0) / proposals.length;
      const avgTimeline = proposals.reduce((sum, p) => sum + Number(p.timeline_days), 0) / proposals.length;
      benchmark = {
        price_benchmark: avgPrice,
        timeline_benchmark_days: Math.round(avgTimeline),
      };
    }

    const proposalData = proposals.map((p: any) => {
      const advisor = Array.isArray(p.advisors) ? p.advisors[0] : p.advisors;
      
      if (!advisor) {
        console.error('[Evaluate] Proposal missing advisor data:', p.id);
        throw new Error(`Proposal ${p.id} is missing advisor data`);
      }
      
      const rfpInviteData = p.advisor_id ? rfpInvitesMap.get(p.advisor_id) : null;
      
      return {
        proposal_id: p.id,
        vendor_name: p.supplier_name,
        extracted_text: p.extracted_text || p.scope_text || '',
        scope_text: p.scope_text,
        price_quoted: Number(p.price),
        currency: p.currency || 'ILS',
        timeline_days: Number(p.timeline_days),
        terms: p.terms,
        conditions_json: p.conditions_json,
        years_experience: calculateYearsExperience(advisor),
        db_internal_rating: Number(advisor.rating) || 0,
        expertise: advisor.expertise || [],
        certifications: advisor.certifications || [],
        company_name: advisor.company_name,
        rfp_request_title: rfpInviteData?.request_title || null,
        rfp_request_content: rfpInviteData?.request_content || null,
        rfp_advisor_type: rfpInviteData?.advisor_type || null,
      };
    });
    
    console.log('[Evaluate] Proposal data prepared:', proposalData.length, 'proposals');

    const userContent = buildUserContent(
      proposalData,
      {
        project_id: project.id,
        project_type: project.type,
        location: project.location,
        budget: project.budget,
        advisors_budget: project.advisors_budget,
        units: project.units,
        description: project.description,
        phase: project.phase || null,
      },
      benchmark
    );

    console.log('[Evaluate] Calling AI with', proposals.length, 'proposals');

    // Build vendor name map for injecting into AI response
    const vendorNameMap = new Map<string, string>();
    for (const p of proposalData) {
      vendorNameMap.set(p.proposal_id, p.vendor_name || p.company_name || 'Unknown Vendor');
    }

    const startTime = Date.now();
    
    // Call appropriate AI provider
    const evaluationResult = await Promise.race([
      aiProvider === 'openai' 
        ? callOpenAI(SYSTEM_INSTRUCTION, userContent, apiKey, vendorNameMap)
        : callGoogleAIStudio(SYSTEM_INSTRUCTION, userContent, apiKey, vendorNameMap),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Evaluation timeout')), EVALUATION_TIMEOUT_MS)
      ),
    ]);
    const evaluationTime = Date.now() - startTime;

    console.log('[Evaluate] AI evaluation completed in', evaluationTime, 'ms');
    
    // Get model name for metadata
    const model = aiProvider === 'openai'
      ? (Deno.env.get('OPENAI_MODEL') || 'gpt-4o')
      : (Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash-002');

    for (const rankedProposal of evaluationResult.ranked_proposals) {
      const proposal = proposals.find((p: any) => p.id === rankedProposal.proposal_id);
      if (!proposal) continue;

      await supabase
        .from('proposals')
        .update({
          evaluation_result: rankedProposal,
          evaluation_score: rankedProposal.final_score,
          evaluation_rank: rankedProposal.rank,
          evaluation_status: 'completed',
          evaluation_completed_at: new Date().toISOString(),
          evaluation_metadata: {
            model_used: model,
            provider: aiProvider === 'openai' ? 'openai' : 'google-ai-studio',
            temperature: 0.0,
            evaluation_time_ms: evaluationTime,
          },
        })
        .eq('id', rankedProposal.proposal_id);
    }

    console.log('[Evaluate] Evaluation results saved to database');

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        batch_summary: evaluationResult.batch_summary,
        ranked_proposals: evaluationResult.ranked_proposals,
        evaluation_metadata: {
          model_used: model,
          provider: aiProvider === 'openai' ? 'openai' : 'google-ai-studio',
          temperature: 0.0,
          total_evaluation_time_ms: evaluationTime,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Evaluate] Error:', error);
    console.error('[Evaluate] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[Evaluate] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    let errorCode = 'EVALUATION_FAILED';
    let errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
    
    if (errorMessage.includes('timeout')) {
      errorCode = 'TIMEOUT';
    } else if (errorMessage.includes('JSON')) {
      errorCode = 'INVALID_JSON';
    } else if (errorMessage.includes('API key') || errorMessage.includes('CONFIGURATION')) {
      errorCode = 'CONFIGURATION_ERROR';
    } else if (errorMessage.includes('API error')) {
      errorCode = 'AI_API_ERROR';
    } else if (errorMessage.includes('ZodError') || errorMessage.includes('validation')) {
      errorCode = 'VALIDATION_ERROR';
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        error_code: errorCode,
        error_details: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.substring(0, 500),
        } : undefined,
        retry_after_seconds: errorCode === 'TIMEOUT' ? 60 : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

