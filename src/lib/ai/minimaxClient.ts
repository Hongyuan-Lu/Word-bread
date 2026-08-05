import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const API_KEY = process.env.MINIMAX_API_KEY;
const API_BASE_URL = process.env.MINIMAX_API_BASE_URL || "https://api.minimaxi.com/v1";
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

if (!API_KEY) {
  throw new Error("Missing MINIMAX_API_KEY in environment variables");
}

export interface MiniMaxMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface MiniMaxRequest {
  model: string;
  messages: MiniMaxMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "text" | "json_object" };
}

export interface MiniMaxResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string | null;
  };
}

export async function chatCompletion(
  messages: MiniMaxMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: "text" | "json_object" };
  }
): Promise<MiniMaxResponse> {
  const request: MiniMaxRequest = {
    model: MODEL,
    messages,
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.max_tokens ?? 4096,
    response_format: options?.response_format ?? { type: "json_object" },
  };

  const url = `${API_BASE_URL}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`MiniMax API error: ${response.status} ${response.statusText}\n${errorText}`);
  }

  return (await response.json()) as MiniMaxResponse;
}

export function buildSystemPrompt(subjectCategories: string[]): string {
  return `你是一个专业的新闻分类助手。

允许的专业类别（必须且只能从以下列表中选择）：
${subjectCategories.map((c) => `- ${c}`).join("\n")}

分类要求：
1. 根据新闻标题、摘要和来源信息，判断其最符合的专业类别
2. 如果有必要，可以选择最多3个次要类别（secondary_categories）
3. 给出分类置信度（0到1之间）
4. 简要说明分类理由

输出格式（必须是JSON数组格式）：
[
  {
    "candidate_id": "候选ID",
    "subject_category": "主类别",
    "subject_confidence": 0.85,
    "subject_reason": "分类理由",
    "secondary_categories": ["次要类别1", "次要类别2"]
  }
]

注意：
- 必须返回有效的JSON数组
- 每个元素必须包含所有必需字段
- 不要添加任何额外的解释或文本`;
}

export function buildUserPrompt(
  candidate: {
    id: string;
    source_title: string;
    source_summary: string | null;
    source_body_text?: string | null;
    source_name: string;
    source_url: string;
    source_section?: string | null;
    source_feed_category?: string | null;
  },
  bodyTextFirstNWords: number = 150
): string {
  let prompt = `请分类以下新闻：

【新闻信息】
- ID: ${candidate.id}
- 标题: ${candidate.source_title}
- 来源: ${candidate.source_name}`;

  if (candidate.source_summary) {
    prompt += `\n- 摘要: ${candidate.source_summary}`;
  }

  if (candidate.source_body_text) {
    const words = candidate.source_body_text.split(/\s+/).slice(0, bodyTextFirstNWords).join(" ");
    prompt += `\n- 正文前${bodyTextFirstNWords}词: ${words}`;
  }

  if (candidate.source_section) {
    prompt += `\n- 来源分类: ${candidate.source_section}`;
  } else if (candidate.source_feed_category) {
    prompt += `\n- RSS分类: ${candidate.source_feed_category}`;
  }

  prompt += `\n- 链接: ${candidate.source_url}`;

  return prompt;
}