// Zod schema for evaluation result validation
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const EvaluationResultSchema = z.object({
  batch_summary: z.object({
    total_proposals: z.number().int().min(1),
    project_type_detected: z.enum(["STANDARD", "LARGE_SCALE"]),
    price_benchmark_used: z.number().positive().nullable(), // null for single proposal
    evaluation_mode: z.enum(["SINGLE", "BATCH"]),
    market_context: z.string().optional(), // Brief note about Israeli market context
  }),
  ranked_proposals: z.array(
    z.object({
      proposal_id: z.string().uuid(),
      vendor_name: z.string().min(1),
      final_score: z.number().int().min(0).max(100),
      rank: z.number().int().min(1),
      data_completeness: z.number().min(0).max(1), // Confidence in score based on available data
      recommendation_level: z.enum([
        "Highly Recommended",
        "Recommended",
        "Review Required",
        "Not Recommended",
      ]),
      individual_analysis: z.object({
        requirements_alignment: z.string(), // Detailed assessment
        price_assessment: z.string(),
        timeline_assessment: z.string(),
        experience_assessment: z.string(),
        scope_quality: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        missing_requirements: z.array(z.string()), // What was requested but not included
        extra_offerings: z.array(z.string()), // What was offered beyond requirements
      }),
      flags: z.object({
        red_flags: z.array(z.string()),
        green_flags: z.array(z.string()),
        knockout_triggered: z.boolean(),
        knockout_reason: z.string().nullable(),
      }),
      comparative_notes: z.string().nullable(), // Only if batch mode, how this compares to others
    })
  ).min(1),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;


