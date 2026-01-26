import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const EvaluationModeSchema = z.enum(["SINGLE", "COMPARE"]);
export type EvaluationMode = z.infer<typeof EvaluationModeSchema>;

export const ProjectTypeDetectedSchema = z.enum(["STANDARD", "LARGE_SCALE"]);
export type ProjectTypeDetected = z.infer<typeof ProjectTypeDetectedSchema>;

export const RecommendationLevelSchema = z.enum([
  "Highly Recommended",
  "Recommended",
  "Review Required",
  "Not Recommended",
]);
export type RecommendationLevel = z.infer<typeof RecommendationLevelSchema>;

const FlagsSchema = z.object({
  red_flags: z.array(z.string()),
  green_flags: z.array(z.string()),
  knockout_triggered: z.boolean(),
  knockout_reason: z.string().nullable(),
});

const IndividualAnalysisBaseSchema = z.object({
  requirements_alignment: z.string(),
  timeline_assessment: z.string(),
  experience_assessment: z.string(),
  scope_quality: z.string(),
  fee_structure_assessment: z.string().optional(),
  payment_terms_assessment: z.string().optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  missing_requirements: z.array(z.string()),
  extra_offerings: z.array(z.string()),
});

const RankedProposalBaseSchema = z.object({
  proposal_id: z.string().uuid(),
  vendor_name: z.string().min(1),
  final_score: z.number().int().min(0).max(100),
  rank: z.number().int().min(1),
  data_completeness: z.number().min(0).max(1),
  recommendation_level: RecommendationLevelSchema,
  flags: FlagsSchema,
});

export const RankedProposalSingleSchema = RankedProposalBaseSchema.extend({
  individual_analysis: IndividualAnalysisBaseSchema,
  comparative_notes: z.null(),
});

export const RankedProposalCompareSchema = RankedProposalBaseSchema.extend({
  individual_analysis: IndividualAnalysisBaseSchema.extend({
    price_assessment: z.string(),
  }),
  comparative_notes: z.string().nullable(),
});

export const BatchSummarySingleSchema = z.object({
  total_proposals: z.number().int().min(1),
  project_type_detected: ProjectTypeDetectedSchema,
  price_benchmark_used: z.null(),
  evaluation_mode: z.literal("SINGLE"),
  market_context: z.string().optional(),
});

export const BatchSummaryCompareSchema = z.object({
  total_proposals: z.number().int().min(1),
  project_type_detected: ProjectTypeDetectedSchema,
  price_benchmark_used: z.number().positive().nullable(),
  evaluation_mode: z.literal("COMPARE"),
  market_context: z.string().optional(),
});

export const EvaluationResultSingleSchema = z.object({
  batch_summary: BatchSummarySingleSchema,
  ranked_proposals: z.array(RankedProposalSingleSchema).min(1),
});

export const EvaluationResultCompareSchema = z.object({
  batch_summary: BatchSummaryCompareSchema,
  ranked_proposals: z.array(RankedProposalCompareSchema).min(1),
});

// The discriminant (`evaluation_mode`) lives under `batch_summary`, so we use
// a simple union of the two shapes.
export const EvaluationResultSchema = z.union([
  EvaluationResultSingleSchema,
  EvaluationResultCompareSchema,
]);

export type EvaluationResultSingle = z.infer<typeof EvaluationResultSingleSchema>;
export type EvaluationResultCompare = z.infer<typeof EvaluationResultCompareSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

