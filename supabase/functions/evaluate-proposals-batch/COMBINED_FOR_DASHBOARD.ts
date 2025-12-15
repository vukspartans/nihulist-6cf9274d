
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVALUATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

// ============================================================================
// ZOD SCHEMA (iz schemas.ts)
// ============================================================================

const EvaluationResultSchema = z.object({
  batch_summary: z.object({
    total_proposals: z.number().int().min(1),
    project_type_detected: z.enum(["STANDARD", "LARGE_SCALE"]),
    price_benchmark_used: z.number().positive(),
  }),
  ranked_proposals: z.array(
    z.object({
      proposal_id: z.string().uuid(),
      vendor_name: z.string().min(1),
      final_score: z.number().int().min(0).max(100),
      rank: z.number().int().min(1),
      recommendation_level: z.enum([
        "Highly Recommended",
        "Recommended",
        "Review Required",
        "Not Recommended",
      ]),
      analysis: z.object({
        price_assessment: z.string(),
        experience_assessment: z.string(),
        scope_quality: z.string(),
      }),
      flags: z.object({
        red_flags: z.array(z.string()),
        green_flags: z.array(z.string()),
        knockout_triggered: z.boolean(),
        knockout_reason: z.string().nullable(),
      }),
    })
  ).min(1),
});

type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

// ============================================================================
// SYSTEM INSTRUCTION (iz prompts.ts)
// ============================================================================

const SYSTEM_INSTRUCTION = `
You are the "Procurement AI," an expert analyst for the real estate and construction industry in Israel.
Your function is to objectively evaluate, score, and rank service proposals from vendors (architects, engineers, lawyers, contractors, consultants) based on specific project constraints and historical data.

OBJECTIVE:
Process a list of vendor proposals against a specific Project Scope.
Output a structured JSON analysis that identifies the best-fit candidate, flags risks, and calculates a weighted score for each proposal.

PROCESSING LOGIC:

STEP 1 - CLASSIFICATION:
Determine Project Type based on 'project_metadata':
- IF (units > 40 OR consultant_budget > 1,000,000 ILS) THEN Type = "LARGE_SCALE"
- ELSE Type = "STANDARD"

STEP 2 - KNOCKOUT CHECK:
Analyze each proposal for "Knockout Criteria". Mark status as REJECTED if:
1. SCOPE_REFUSAL: Vendor explicitly excludes core services required by the scope.
2. CREDENTIALS_MISSING: Vendor lacks mandatory licensing or certifications mentioned in required_scope.
3. PAYMENT_TERMS_VIOLATION: Vendor demands terms widely divergent from client request (e.g., 100% upfront when milestone-based was requested).

STEP 3 - SCORING WEIGHTS:
Calculate a score (0-100) for each non-rejected proposal:

[DEFAULT WEIGHTS]
- Price: 20%
- Professional Experience: 30%
- Proposal Quality (Scope adherence): 13%
- Payment Terms: 12%
- Internal System Rating (History): 20%
- Team Fit/Collaboration: 5% (If unknown, redistribute to Quality/Terms)

[LARGE_SCALE ADJUSTMENT]
IF Type == "LARGE_SCALE":
- Increase Experience weight by +15% (Total 45%)
- Reduce Price weight by -5% (Total 15%)
- Reduce others proportionally

STEP 4 - PRICE ANALYSIS:
Reference Value = Average of all proposals in batch OR provided 'benchmark_data'.

RULES:
- IF Price < (Reference * 0.5): Flag as "SUSPICIOUSLY_LOW". Apply severe penalty.
- IF Price > (Reference * 1.4): Flag as "EXPENSIVE". Apply moderate penalty.
- IF Price format is "Hourly" but request was "Fixed": Flag as FORMAT_MISMATCH.

STEP 5 - SEMANTIC ANALYSIS:
Scan textual content for specific phrases:

RED_FLAGS:
"Not included", "Estimate only", "Price TBD", "Subject to availability",
"No commitment to schedule", "Additional costs may apply", "Excludes", "Not responsible for"

GREEN_FLAGS:
"Full coordination included", "Unlimited revisions", "Until permit obtained",
"Full responsibility", "Fast response", "Includes all consultant coordination", "Complete scope"

OUTPUT FORMAT:
Return ONLY a raw JSON object. No markdown formatting, no conversational filler.

JSON Schema:
{
  "batch_summary": {
    "total_proposals": Integer,
    "project_type_detected": "STANDARD" | "LARGE_SCALE",
    "price_benchmark_used": Float
  },
  "ranked_proposals": [
    {
      "proposal_id": "String (UUID)",
      "vendor_name": "String",
      "final_score": Integer (0-100),
      "rank": Integer (1 = best),
      "recommendation_level": "Highly Recommended" | "Recommended" | "Review Required" | "Not Recommended",
      "analysis": {
        "price_assessment": "String (e.g., '15% below average')",
        "experience_assessment": "String (e.g., 'Matches Large Scale requirements')",
        "scope_quality": "String"
      },
      "flags": {
        "red_flags": ["String"],
        "green_flags": ["String"],
        "knockout_triggered": Boolean,
        "knockout_reason": "String or Null"
      }
    }
  ]
}

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.
`;

// ============================================================================
// HELPER FUNCTIONS (iz payload-builder.ts)
// ============================================================================

function calculateYearsExperience(advisor: { founding_year: number | null }): number {
  if (!advisor.founding_year) return 0;
  return Math.max(0, new Date().getFullYear() - advisor.founding_year);
}

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

function buildUserContent(
  proposals: ProposalData[],
  project: ProjectMetadata,
  benchmark: BenchmarkData
): string {
  const isLargeScale = (project.units !== null && project.units > 40) || 
                       (project.advisors_budget !== null && project.advisors_budget > 1000000);

  const required_scope = extractScopeFromDescription(project.description, project.project_type);

  const userContent = {
    project_metadata: {
      project_id: project.project_id,
      project_type: project.project_type || "Unknown",
      location: project.location || "Unknown",
      budget: project.budget,
      advisors_budget: project.advisors_budget,
      units: project.units,
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
      extracted_text: p.extracted_text || p.scope_text || "",
      price_quoted: p.price_quoted,
      currency: p.currency || "ILS",
      timeline_days: p.timeline_days,
      terms: p.terms || "",
      conditions: p.conditions_json || {},
      years_experience: p.years_experience,
      db_internal_rating: p.db_internal_rating,
      expertise: p.expertise || [],
      certifications: p.certifications || []
    }))
  };

  return JSON.stringify(userContent, null, 2);
}

// ============================================================================
// MAIN FUNCTION (iz index.ts)
// ============================================================================

// Call OpenAI API (switched from Google Gemini due to quota issues)
async function callOpenAI(
  systemInstruction: string,
  userContent: string,
  apiKey: string
): Promise<EvaluationResult> {
  // Best model for this use case: gpt-4o (best quality, excellent for complex JSON analysis)
  // gpt-4o-mini is faster and cheaper alternative
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

  // Validate with Zod
  const validated = EvaluationResultSchema.parse(parsed);
  return validated;
}

interface EvaluateRequest {
  project_id: string;
  proposal_ids?: string[];
  benchmark_data?: {
    price_benchmark: number;
    timeline_benchmark_days: number;
  };
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

    const { project_id, proposal_ids, benchmark_data }: EvaluateRequest = await req.json();

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

    // Get API key from environment only (no hardcoded fallback)
    const apiKey = Deno.env.get('OPENAI_API_KEY') 
      || Deno.env.get('OPENAI_KEY');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OpenAI API key not configured. Set OPENAI_API_KEY environment variable.',
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
      .select('id, name, type, location, budget, advisors_budget, units, description, is_large_scale')
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
      .eq('status', 'submitted');

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
    
    // Validate that all proposals have advisors
    for (const proposal of proposals) {
      if (!proposal.advisors || !proposal.advisor_id) {
        console.error('[Evaluate] Proposal missing advisor:', proposal.id);
        throw new Error(`Proposal ${proposal.id} is missing advisor information`);
      }
    }

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
      },
      benchmark
    );

    console.log('[Evaluate] Calling AI with', proposals.length, 'proposals');

    const startTime = Date.now();
    const evaluationResult = await Promise.race([
      callOpenAI(SYSTEM_INSTRUCTION, userContent, apiKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Evaluation timeout')), EVALUATION_TIMEOUT_MS)
      ),
    ]);
    const evaluationTime = Date.now() - startTime;

    console.log('[Evaluate] AI evaluation completed in', evaluationTime, 'ms');

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
            model_used: Deno.env.get('OPENAI_MODEL') || 'gpt-4o',
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
          model_used: Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash',
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

