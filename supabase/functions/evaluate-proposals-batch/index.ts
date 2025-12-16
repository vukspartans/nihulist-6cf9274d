import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { EvaluationResultSchema, type EvaluationResult } from "./schemas.ts";
import { SYSTEM_INSTRUCTION } from "./prompts.ts";
import { buildUserContent } from "./payload-builder.ts";
import { callGoogleAIStudio } from "./google-ai-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVALUATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface EvaluateRequest {
  project_id: string;
  proposal_ids?: string[]; // Optional: if empty, all proposals for project
  benchmark_data?: {
    price_benchmark: number;
    timeline_benchmark_days: number;
  };
  force_reevaluate?: boolean; // If true, re-evaluate even if results exist
}

// Helper to calculate years experience
function calculateYearsExperience(advisor: { founding_year: number | null }): number {
  if (!advisor.founding_year) return 0;
  return Math.max(0, new Date().getFullYear() - advisor.founding_year);
}

// Helper to get Google AI Studio API key
function getGoogleAPIKey(): string {
  // Try GOOGLE_API_KEY first (standard name)
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || Deno.env.get('GEMENI_API_KEY');
  
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY or GEMENI_API_KEY environment variable is not set. Please configure Google AI Studio API key.');
  }
  
  return apiKey;
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

    // Get Google AI Studio API key
    let apiKey: string;
    try {
      apiKey = getGoogleAPIKey();
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load Google AI Studio API key',
          error_code: 'CONFIGURATION_ERROR',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch project (including phase)
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

    // Fetch proposals
    // Note: Using explicit relationship name because there are multiple FK constraints
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
      .eq('status', 'submitted'); // Only evaluate submitted proposals

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
    
    // Check if proposals already have evaluation results (unless force_reevaluate is true)
    if (!force_reevaluate) {
      const proposalIds = proposals.map(p => p.id);
      const { data: existingEvaluations } = await supabase
        .from('proposals')
        .select('id, evaluation_status, evaluation_result, evaluation_score, evaluation_rank')
        .in('id', proposalIds)
        .eq('evaluation_status', 'completed');
      
      // If all proposals are already evaluated, return existing results
      if (existingEvaluations && existingEvaluations.length === proposals.length) {
        console.log('[Evaluate] All proposals already evaluated, returning cached results');
        
        // Build response from existing evaluations
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
              price_benchmark_used: null, // We don't have this in cache
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
    
    // Deterministic sort: Sort proposals by ID to ensure consistent ordering
    proposals.sort((a, b) => a.id.localeCompare(b.id));
    console.log('[Evaluate] Proposals sorted deterministically by ID');
    
    // Validate that all proposals have advisors
    for (const proposal of proposals) {
      if (!proposal.advisors || !proposal.advisor_id) {
        console.error('[Evaluate] Proposal missing advisor:', proposal.id);
        throw new Error(`Proposal ${proposal.id} is missing advisor information`);
      }
    }

    // Fetch RFP invite data for proposals (to get request_title, request_content, advisor_type)
    // We need to find RFP invites that match proposal advisor_id and project
    const advisorIds = proposals.map(p => p.advisor_id).filter(Boolean);
    let rfpInvitesMap = new Map<string, { request_title: string | null; request_content: string | null; advisor_type: string | null }>();
    
    if (advisorIds.length > 0) {
      // Find RFPs for this project
      const { data: rfps, error: rfpsError } = await supabase
        .from('rfps')
        .select('id')
        .eq('project_id', project_id);
      
      if (!rfpsError && rfps && rfps.length > 0) {
        const rfpIds = rfps.map(r => r.id);
        
        // Fetch RFP invites for these RFPs and advisors
        const { data: invites, error: invitesError } = await supabase
          .from('rfp_invites')
          .select('advisor_id, request_title, request_content, advisor_type')
          .in('rfp_id', rfpIds)
          .in('advisor_id', advisorIds);
        
        if (!invitesError && invites) {
          // Create map: advisor_id -> RFP invite data
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

    // Ensure extracted text exists for all proposals
    for (const proposal of proposals) {
      if (!proposal.extracted_text || proposal.extracted_text.trim().length < 50) {
        console.log(`[Evaluate] Extracting text for proposal ${proposal.id}`);
        
        // Call extract-proposal-text function
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
          // Use scope_text as fallback
          proposal.extracted_text = proposal.scope_text || '';
        }
      }
    }

    // Calculate benchmark if not provided
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

    // Build proposal data for AI
    const proposalData = proposals.map((p: any) => {
      const advisor = Array.isArray(p.advisors) ? p.advisors[0] : p.advisors;
      
      if (!advisor) {
        console.error('[Evaluate] Proposal missing advisor data:', p.id);
        throw new Error(`Proposal ${p.id} is missing advisor data`);
      }
      
      // Get RFP invite data for this proposal's advisor
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
        // RFP invite data (may be null if proposal wasn't from RFP)
        rfp_request_title: rfpInviteData?.request_title || null,
        rfp_request_content: rfpInviteData?.request_content || null,
        rfp_advisor_type: rfpInviteData?.advisor_type || null,
      };
    });
    
    console.log('[Evaluate] Proposal data prepared:', proposalData.length, 'proposals');

    // Build user content
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

    // Call Google AI Studio (Gemini)
    const startTime = Date.now();
    const model = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash';
    const evaluationResult = await Promise.race([
      callGoogleAIStudio(SYSTEM_INSTRUCTION, userContent, apiKey),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Evaluation timeout')), EVALUATION_TIMEOUT_MS)
      ),
    ]);
    const evaluationTime = Date.now() - startTime;

    console.log('[Evaluate] AI evaluation completed in', evaluationTime, 'ms');

    // Update proposals with evaluation results
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
            provider: 'google-ai-studio',
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
          provider: 'google-ai-studio',
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
    
    // Determine error type
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

