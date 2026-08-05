import { minimaxLLM } from "./minimaxLangChainClient";
import { RewriteResult, validateRewriteResult } from "./rewriteArticleSchemas";
import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

interface NewsCandidate {
  candidate_id: string;
  source_name: string;
  source_title: string;
  source_summary: string | null;
  source_body_text?: string | null;
  source_excerpt?: string | null;
  [key: string]: unknown;
}

function extractJsonFromResponse(content: string): unknown | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      return null;
    }
  }

  const jsonArrayMatch = content.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonArrayMatch) {
    try {
      return JSON.parse(jsonArrayMatch[0]);
    } catch {
      return null;
    }
  }

  const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch {
      return null;
    }
  }

  return null;
}

function buildRewriteSystemPrompt(): string {
  return `你是一个专业的英语学习内容创作助手，擅长将新闻改写成适合 CET4 和 CET6 学习者的阅读材料。

你的任务：
1. 将新闻标题翻译成中文（不要改写，只翻译）
2. 根据新闻内容改写成约 300 词的英语短文
3. 同时生成对应的自然中文翻译
4. 不编造任何新闻原文没有的事实
5. 不使用 HTML 标签
6. 不使用 markdown 格式
7. 输出必须是纯 JSON 格式

标题翻译要求：
- 只翻译，不改写
- 保持原意，通顺自然

CET4 版本要求：
- 句子较短，结构清晰
- 词汇尽量基础，避免复杂生词
- 适合 CET4 水平学习者阅读

CET6 版本要求：
- 表达更自然，允许适度复杂句
- 但仍保持清晰，不要写成原版外刊难度
- 适合 CET6 水平学习者阅读`;
}

function buildRewriteUserPrompt(candidate: NewsCandidate): string {
  const title = candidate.source_title || "";
  const summary = candidate.source_summary || "";
  const bodyText = candidate.source_body_text || "";
  const excerpt = candidate.source_excerpt || "";

  let contentSource = "";
  let instruction = "";

  if (candidate.source_name === "The Guardian") {
    if (bodyText && bodyText.length > 100) {
      contentSource = `标题：${title}\n\n摘要：${summary}\n\n正文：${bodyText}`;
      instruction = "你将基于上面的标题、摘要和正文进行改写。";
    } else {
      contentSource = `标题：${title}\n\n摘要：${summary}`;
      instruction = "你将基于上面的标题和摘要进行改写。由于没有提供正文，你需要基于已有信息扩写成学习短文，但不要编造标题和摘要之外的事实。";
    }
  } else if (candidate.source_name === "ScienceDaily") {
    if (bodyText && bodyText.length > 100) {
      contentSource = `标题：${title}\n\n摘要：${summary}\n\n正文：${bodyText}`;
      instruction = "你将基于上面的标题、摘要和正文进行改写。";
    } else {
      contentSource = `标题：${title}\n\n摘要：${summary}`;
      instruction = "你将基于上面的标题和摘要进行改写。由于没有提供正文，你需要基于已有信息扩写成学习短文，但不要编造标题和摘要之外的事实。";
    }
  } else {
    if (bodyText && bodyText.length > 100) {
      contentSource = `标题：${title}\n\n摘要：${summary}\n\n正文：${bodyText}`;
      instruction = "你将基于上面的标题、摘要和正文进行改写。";
    } else {
      contentSource = `标题：${title}\n\n摘要：${summary}`;
      instruction = "你将基于上面的标题和摘要进行改写。由于没有提供正文，你需要基于已有信息扩写成学习短文，但不要编造标题和摘要之外的事实。";
    }
  }

  return `${instruction}\n\n请严格按以下 JSON 格式输出（必须是有效 JSON，不要有其他内容）：\n{\n  "title_en": "英文标题...',\n  "title_zh": "中文标题...',\n  "cet4_body_en": "CET4英文短文，约300词，句子较短，词汇基础...',\n  "cet4_body_zh": "CET4英文短文的中文翻译...',\n  "cet6_body_en": "CET6英文短文，约300词，表达自然，允许适度复杂句...',\n  "cet6_body_zh": "CET6英文短文的中文翻译...'\n}\n\n${contentSource}`;
}

export async function rewriteNewsArticle(
  candidate: NewsCandidate,
  maxRetries: number = 10,
  retryDelayMs: number = 5000
): Promise<{ success: true; result: RewriteResult; candidate: NewsCandidate } | { success: false; error: string; candidate: NewsCandidate }> {
  const systemPrompt = buildRewriteSystemPrompt();
  const userPrompt = buildRewriteUserPrompt(candidate);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await minimaxLLM.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);

      let responseContent = "";
      if (typeof response === "string") {
        responseContent = response;
      } else if (response && typeof response === "object") {
        const responseObj = response as { content?: string | Array<{ text?: string }> };
        if (typeof responseObj.content === "string") {
          responseContent = responseObj.content;
        } else if (Array.isArray(responseObj.content) && responseObj.content.length > 0) {
          responseContent = (responseObj.content[0] as { text?: string }).text || "";
        }
      }

      const parsed = extractJsonFromResponse(responseContent);
      if (!parsed) {
        console.error(`[${candidate.candidate_id}] 第 ${attempt} 次尝试：无法从响应中提取 JSON`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
        }
        continue;
      }

      const validation = validateRewriteResult(parsed);
      if (!validation.success) {
        console.error(`[${candidate.candidate_id}] 第 ${attempt} 次尝试：Zod 校验失败 - ${validation.error}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryDelayMs));
        }
        continue;
      }

      return {
        success: true,
        result: validation.data!,
        candidate,
      };
    } catch (error) {
      console.error(`[${candidate.candidate_id}] 第 ${attempt} 次尝试：调用失败 - ${error instanceof Error ? error.message : String(error)}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }

  return {
    success: false,
    error: `经过 ${maxRetries} 次重试后仍然失败`,
    candidate,
  };
}