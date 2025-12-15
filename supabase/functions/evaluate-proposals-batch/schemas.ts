// Zod schema for evaluation result validation
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const EvaluationResultSchema = z.object({
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

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;


