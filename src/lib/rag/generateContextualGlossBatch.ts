import { minimaxLLM } from "../ai/minimaxLangChainClient";
import {
  type GlossBatchInput,
  type TargetToken,
} from "./buildGlossBatchInput";
import {
  validateContextualGlossBatch,
  type ContextualGlossBatch,
} from "../ai/contextualGlossSchemas";
import type { ContextualGlossItem } from "../ai/contextualGlossSchemas";

const SYSTEM_PROMPT = `你是一个英语学习辅助工具。你的任务是为文章中的超纲英文单词生成简短的中文语境释义。

要求：
- 只返回一个 JSON 对象，不要有任何额外输出
- short_explanation 必须是中文，不超过 80 个汉字
- 不要输出 HTML 或 Markdown
- 不要解释词汇等级或考试级别
- 根据单词在当前句子中的上下文给出准确含义`;

function buildUserPrompt(input: GlossBatchInput): string {
  const tokensList = input.target_tokens
    .map((t) => {
      const prev = t.previous_sentence ? `【前一句】${t.previous_sentence}` : "";
      const next = t.next_sentence ? `【后一句】${t.next_sentence}` : "";
      return `【token_id】${t.token_id}
【单词】${t.surface}
【原形】${t.lemma}
【当前句子】${t.current_sentence}
${prev}
${next}`;
    })
    .join("\n\n");

  return `【文章 ID】${input.article_id}
【目标考试】${input.target_exam}
【完整文章】${input.article_text}

【待解释的单词列表】
${tokensList}

请为每个单词生成中文语境释义。返回格式：
{
  "items": [
    {"token_id": "xxx", "short_explanation": "xxx"},
    ...
  ]
}`;
}

export interface GenerationResult {
  success: boolean;
  items?: ContextualGlossItem[];
  error?: string;
}

export async function generateContextualGlossBatch(
  input: GlossBatchInput
): Promise<GenerationResult> {
  if (input.target_tokens.length === 0) {
    return { success: true, items: [] };
  }

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: buildUserPrompt(input) },
  ];

  try {
    const response = await minimaxLLM.invoke(messages);
    const rawContent = typeof response.content === "string" 
      ? response.content 
      : JSON.stringify(response.content);

    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: `Response does not contain valid JSON: ${rawContent.slice(0, 200)}` };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validation = validateContextualGlossBatch(parsed);

    if (!validation.success) {
      return { success: false, error: validation.error };
    }

    const batchTokenIds = new Set(input.target_tokens.map((t) => t.token_id));
    const validItems = validation.data!.items.filter((item) =>
      batchTokenIds.has(item.token_id)
    );

    return { success: true, items: validItems };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}