import { z } from "zod";

export const RewriteResultSchema = z.object({
  title_en: z.string().min(1, "title_en 不能为空"),
  title_zh: z.string().min(1, "title_zh 不能为空"),
  cet4_body_en: z.string().min(1, "cet4_body_en 不能为空"),
  cet4_body_zh: z.string().min(1, "cet4_body_zh 不能为空"),
  cet6_body_en: z.string().min(1, "cet6_body_en 不能为空"),
  cet6_body_zh: z.string().min(1, "cet6_body_zh 不能为空"),
});

export type RewriteResult = z.infer<typeof RewriteResultSchema>;

export function validateRewriteResult(data: unknown): {
  success: boolean;
  data?: RewriteResult;
  error?: string;
} {
  const result = RewriteResultSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
  };
}