import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ChatOpenAI } from "@langchain/openai";

const API_KEY = process.env.MINIMAX_API_KEY;
const API_BASE_URL = process.env.MINIMAX_API_BASE_URL || "https://api.minimaxi.com/v1";
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2.7";

if (!API_KEY) {
  throw new Error("Missing MINIMAX_API_KEY in environment variables");
}

export const minimaxLLM = new ChatOpenAI({
  model: MODEL,
  apiKey: API_KEY,
  configuration: {
    baseURL: API_BASE_URL,
  },
  temperature: 0.3,
  maxTokens: 4096,
});