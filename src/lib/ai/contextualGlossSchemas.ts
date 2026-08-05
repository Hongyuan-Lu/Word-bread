import { z } from "zod";

export const ContextualGlossItemSchema = z.object({
  token_id: z.string().uuid(),
  short_explanation: z.string().min(1).max(80),
});

export const ContextualGlossBatchSchema = z.object({
  items: z.array(ContextualGlossItemSchema),
});

export type ContextualGlossItem = z.infer<typeof ContextualGlossItemSchema>;
export type ContextualGlossBatch = z.infer<typeof ContextualGlossBatchSchema>;

export function validateContextualGlossBatch(data: unknown): {
  success: boolean;
  data?: ContextualGlossBatch;
  error?: string;
} {
  const result = ContextualGlossBatchSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
  };
}