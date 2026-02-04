// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

import { EvaluationResultSchema, type EvaluationMode, type EvaluationResult } from "./schema.ts";
import { fetchEvaluationInputs } from "./fetch.ts";
import { computeDeterministicScores, recommendationFromScore } from "./scoring.ts";
import { buildUserContent, systemInstruction } from "./prompts.ts";
import { runPreCheck } from "./precheck.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVALUATION_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

interface EvaluateRequest {
  project_id: string;
  proposal_ids?: string[];
  force_reevaluate?: boolean;
}

function getGoogleAPIKey(): string {
  const apiKey = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMENI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY or GEMENI_API_KEY environment variable is not set. Please configure Google AI Studio API key.",
    );
  }
  return apiKey;
}

function getOpenAIAPIKey(): string {
  const apiKey = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set. Please configure OpenAI API key.");
  }
  return apiKey;
}

function getAIProvider(): "openai" | "google" {
  const explicitProvider = Deno.env.get("AI_PROVIDER")?.toLowerCase();
  if (explicitProvider === "openai" || explicitProvider === "google") {
    return explicitProvider as "openai" | "google";
  }

  const hasOpenAI = !!(Deno.env.get("OPENAI_API_KEY") || Deno.env.get("OPENAI_KEY"));
  const hasGoogle = !!(Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMENI_API_KEY"));

  if (hasOpenAI) return "openai";
  if (hasGoogle) return "google";
  return "google";
}

function stripFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return cleaned.trim();
}

async function callOpenAI(system: string, user: string, apiKey: string): Promise<any> {
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o";
  const aiEndpoint = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.0,
    response_format: { type: "json_object" },
    max_tokens: 8192,
  };

  const response = await fetch(aiEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const jsonText = result.choices?.[0]?.message?.content;
  if (!jsonText) throw new Error("No content in AI response.");

  return JSON.parse(stripFences(jsonText));
}

async function callGoogleAIStudio(system: string, user: string, apiKey: string): Promise<any> {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-002";
  const apiVersion = model.includes("gemini-3") ? "v1beta" : "v1";
  const aiEndpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`;

  const generationConfig: any = {
    temperature: 0.0,
    topK: 1,
    topP: 0.95,
    maxOutputTokens: 8192,
  };
  if (apiVersion === "v1beta") {
    generationConfig.responseMimeType = "application/json";
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${system}\n\n${user}` }],
      },
    ],
    generationConfig,
  };

  const response = await fetch(aiEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const result = await response.json();
  const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("No content in AI response.");

  return JSON.parse(stripFences(jsonText));
}

function stableSortByScore(scores: Array<{ proposal_id: string; final_score_locked: number }>) {
  return [...scores].sort((a, b) => {
    if (b.final_score_locked !== a.final_score_locked) return b.final_score_locked - a.final_score_locked;
    return a.proposal_id.localeCompare(b.proposal_id);
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { project_id, proposal_ids, force_reevaluate = false }: EvaluateRequest = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ success: false, error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiProvider = getAIProvider();
    const apiKey = aiProvider === "openai" ? getOpenAIAPIKey() : getGoogleAPIKey();

    const { project, proposals, rfp, organizationAndPolicies, vendorCompanies } = await fetchEvaluationInputs(supabase, { project_id, proposal_ids });
    const mode: EvaluationMode = proposals.length === 1 ? "SINGLE" : "COMPARE";

    const preCheck = runPreCheck(proposals, organizationAndPolicies?.policies ?? null, vendorCompanies);

    // Cache shortcut (best-effort): if all selected proposals already evaluated, return cached.
    if (!force_reevaluate) {
      const proposalIds = proposals.map((p) => p.proposal.id);
      const { data: existingEvaluations } = await supabase
        .from("proposals")
        .select("id, evaluation_status, evaluation_result, evaluation_score, evaluation_rank")
        .in("id", proposalIds)
        .eq("evaluation_status", "completed");

      if (existingEvaluations && existingEvaluations.length === proposals.length) {
        const rankedProposals = existingEvaluations
          .map((e) => ({
            proposal_id: e.id,
            ...(e.evaluation_result as any),
            final_score: e.evaluation_score,
            rank: e.evaluation_rank,
          }))
          .sort((a, b) => (a.rank || 0) - (b.rank || 0));

        return new Response(
          JSON.stringify({
            success: true,
            cached: true,
            project_id,
            batch_summary: {
              total_proposals: proposals.length,
              evaluation_mode: mode,
              project_type_detected: project.is_large_scale ? "LARGE_SCALE" : "STANDARD",
              price_benchmark_used: mode === "SINGLE" ? null : null,
              market_context: "Using cached evaluation results",
            },
            ranked_proposals: rankedProposals,
            evaluation_metadata: {
              cached: true,
              note: "These are cached results from a previous evaluation. Set force_reevaluate=true to re-run evaluation.",
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Ensure extracted_text exists (best-effort) for better explanations
    for (const p of proposals) {
      const text = (p.proposal.extracted_text || "").trim();
      if (text.length >= 50) continue;

      try {
        const extractResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/extract-proposal-text`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ proposal_id: p.proposal.id }),
        });

        if (extractResponse.ok) {
          const extractResult = await extractResponse.json();
          p.proposal.extracted_text = extractResult.extracted_text || p.proposal.scope_text || "";
        } else {
          p.proposal.extracted_text = p.proposal.scope_text || "";
        }
      } catch {
        p.proposal.extracted_text = p.proposal.scope_text || "";
      }
    }

    const deterministicBase = computeDeterministicScores(mode, rfp, proposals, {
      policyViolations: preCheck.all_violations,
      vendorCompanies,
    });
    const rankedByScore = stableSortByScore(
      deterministicBase.map((d) => ({ proposal_id: d.proposal_id, final_score_locked: d.final_score })),
    );

    const deterministicLocked = deterministicBase.map((d) => {
      const rank = rankedByScore.findIndex((x) => x.proposal_id === d.proposal_id) + 1;
      const recommendation = recommendationFromScore(d.final_score);
      return {
        ...d,
        final_score_locked: d.final_score,
        rank_locked: rank,
        recommendation_level_locked: recommendation,
        data_completeness_locked: d.data_completeness,
        knockout_triggered_locked: d.knockout_triggered,
      };
    });

    const userContent = buildUserContent({
      mode,
      project,
      rfp,
      proposals,
      deterministic: deterministicLocked,
      organizationPolicies: organizationAndPolicies?.policies ?? null,
      vendorCompanies,
    });

    const sys = systemInstruction(mode);
    const startTime = Date.now();
    const raw = await Promise.race([
      aiProvider === "openai" ? callOpenAI(sys, userContent, apiKey) : callGoogleAIStudio(sys, userContent, apiKey),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Evaluation timeout")), EVALUATION_TIMEOUT_MS)),
    ]);
    const evaluationTime = Date.now() - startTime;

    // Lock numeric fields + enforce deterministic ordering/ranks
    const byId = new Map<string, any>();
    if (raw?.ranked_proposals && Array.isArray(raw.ranked_proposals)) {
      for (const rp of raw.ranked_proposals) {
        if (rp && typeof rp.proposal_id === "string") byId.set(rp.proposal_id, rp);
      }
    }

    const proposalsById = new Map(proposals.map((p) => [p.proposal.id, p]));

    const ranked_proposals = rankedByScore.map(({ proposal_id }) => {
      const base = deterministicLocked.find((d) => d.proposal_id === proposal_id)!;
      const fromModel = byId.get(proposal_id) ?? {};
      const proposal = proposalsById.get(proposal_id);

      const vendor_name = proposal?.proposal.supplier_name || proposal?.advisor.company_name || "ספק לא ידוע";
      const policyAndVendorFlags = [...(base.policy_red_flags ?? []), ...(base.vendor_completeness_flags ?? [])];
      const modelRedFlags = Array.isArray(fromModel?.flags?.red_flags) ? fromModel.flags.red_flags : [];
      const red_flags = [...new Set([...policyAndVendorFlags, ...modelRedFlags])];

      const common = {
        proposal_id,
        vendor_name,
        final_score: base.final_score_locked,
        rank: base.rank_locked,
        data_completeness: base.data_completeness_locked,
        recommendation_level: base.recommendation_level_locked,
        flags: {
          red_flags,
          green_flags: Array.isArray(fromModel?.flags?.green_flags) ? fromModel.flags.green_flags : [],
          knockout_triggered: base.knockout_triggered_locked,
          knockout_reason: base.knockout_triggered_locked
            ? (typeof fromModel?.flags?.knockout_reason === "string" && fromModel.flags.knockout_reason.trim()
              ? fromModel.flags.knockout_reason
              : base.knockout_reason_hint)
            : null,
        },
      };

      if (mode === "SINGLE") {
        return {
          ...common,
          individual_analysis: {
            requirements_alignment: fromModel?.individual_analysis?.requirements_alignment ?? "לא סופק",
            timeline_assessment: fromModel?.individual_analysis?.timeline_assessment ?? "לא סופק",
            experience_assessment: fromModel?.individual_analysis?.experience_assessment ?? "לא סופק",
            scope_quality: fromModel?.individual_analysis?.scope_quality ?? "לא סופק",
            fee_structure_assessment: fromModel?.individual_analysis?.fee_structure_assessment,
            payment_terms_assessment: fromModel?.individual_analysis?.payment_terms_assessment,
            strengths: Array.isArray(fromModel?.individual_analysis?.strengths) ? fromModel.individual_analysis.strengths : [],
            weaknesses: Array.isArray(fromModel?.individual_analysis?.weaknesses) ? fromModel.individual_analysis.weaknesses : [],
            missing_requirements: Array.isArray(fromModel?.individual_analysis?.missing_requirements)
              ? fromModel.individual_analysis.missing_requirements
              : [...base.missing_mandatory_fee_items, ...base.missing_mandatory_scope_items],
            extra_offerings: Array.isArray(fromModel?.individual_analysis?.extra_offerings) ? fromModel.individual_analysis.extra_offerings : [],
          },
          comparative_notes: null,
        };
      }

      return {
        ...common,
        individual_analysis: {
          requirements_alignment: fromModel?.individual_analysis?.requirements_alignment ?? "לא סופק",
          price_assessment: fromModel?.individual_analysis?.price_assessment ?? "לא סופק",
          timeline_assessment: fromModel?.individual_analysis?.timeline_assessment ?? "לא סופק",
          experience_assessment: fromModel?.individual_analysis?.experience_assessment ?? "לא סופק",
          scope_quality: fromModel?.individual_analysis?.scope_quality ?? "לא סופק",
          fee_structure_assessment: fromModel?.individual_analysis?.fee_structure_assessment,
          payment_terms_assessment: fromModel?.individual_analysis?.payment_terms_assessment,
          strengths: Array.isArray(fromModel?.individual_analysis?.strengths) ? fromModel.individual_analysis.strengths : [],
          weaknesses: Array.isArray(fromModel?.individual_analysis?.weaknesses) ? fromModel.individual_analysis.weaknesses : [],
          missing_requirements: Array.isArray(fromModel?.individual_analysis?.missing_requirements)
            ? fromModel.individual_analysis.missing_requirements
            : [...base.missing_mandatory_fee_items, ...base.missing_mandatory_scope_items],
          extra_offerings: Array.isArray(fromModel?.individual_analysis?.extra_offerings) ? fromModel.individual_analysis.extra_offerings : [],
        },
        comparative_notes: typeof fromModel?.comparative_notes === "string" ? fromModel.comparative_notes : null,
      };
    });

    const evaluationResult: EvaluationResult = EvaluationResultSchema.parse({
      batch_summary: {
        total_proposals: proposals.length,
        evaluation_mode: mode,
        project_type_detected: project.is_large_scale ? "LARGE_SCALE" : "STANDARD",
        price_benchmark_used: mode === "SINGLE" ? null : null,
        market_context: typeof raw?.batch_summary?.market_context === "string" ? raw.batch_summary.market_context : undefined,
      },
      ranked_proposals,
    });

    // Persist per proposal
    const model = aiProvider === "openai"
      ? (Deno.env.get("OPENAI_MODEL") || "gpt-4o")
      : (Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash-002");

    for (const rp of evaluationResult.ranked_proposals) {
      await supabase
        .from("proposals")
        .update({
          evaluation_result: rp,
          evaluation_score: rp.final_score,
          evaluation_rank: rp.rank,
          evaluation_status: "completed",
          evaluation_completed_at: new Date().toISOString(),
          evaluation_metadata: {
            model_used: model,
            provider: aiProvider === "openai" ? "openai" : "google-ai-studio",
            temperature: 0.0,
            evaluation_time_ms: evaluationTime,
          },
        })
        .eq("id", rp.proposal_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        batch_summary: evaluationResult.batch_summary,
        ranked_proposals: evaluationResult.ranked_proposals,
        evaluation_metadata: {
          model_used: model,
          provider: aiProvider === "openai" ? "openai" : "google-ai-studio",
          temperature: 0.0,
          total_evaluation_time_ms: evaluationTime,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Evaluation failed";
    const status = (error as any)?.status ?? 500;

    let error_code = "EVALUATION_FAILED";
    if (msg.includes("timeout")) error_code = "TIMEOUT";
    else if (msg.includes("JSON")) error_code = "INVALID_JSON";
    else if (msg.includes("API key") || msg.includes("CONFIGURATION")) error_code = "CONFIGURATION_ERROR";
    else if (msg.includes("AI API error")) error_code = "AI_API_ERROR";
    else if (msg.includes("ZodError") || msg.includes("validation")) error_code = "VALIDATION_ERROR";

    return new Response(
      JSON.stringify({
        success: false,
        error: msg,
        error_code,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
