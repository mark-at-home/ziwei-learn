import type { ChartAnalysis, QuizQuestion, Dimension } from '../types';
import { chartToPromptText } from './chart-to-text';
import type { Astrolabe } from './iztro-wrapper';
import {
  ANALYSIS_SYSTEM, buildAnalysisPrompt,
  QUIZ_SYSTEM, buildQuizPrompt,
} from './prompts';

export type LLMModel = 'claude' | 'claude-4-6' | 'gemini' | 'gemini-pro' | 'gemini-thinking' | 'gemini-3-flash' | 'gemini-3-pro';

// 本地开发时走 Vite proxy（见 vite.config.ts），线上走 Vercel Serverless Function
const PROXY_URL = '/api/chat';

async function callLLM(
  system: string,
  userMessage: string,
  model: LLMModel,
  maxTokens = 4096,
): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      system,
      messages: [{ role: 'user', content: userMessage }],
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? '代理服务异常');
  }

  const data = await res.json();
  return data.content as string;
}

/** 将 JSON 字符串内部的原始换行符转义为 \n，避免 JSON.parse 失败 */
function sanitizeJSONString(raw: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (escaped) { out += c; escaped = false; continue; }
    if (c === '\\') { out += c; escaped = true; continue; }
    if (c === '"') { inString = !inString; out += c; continue; }
    if (inString && (c === '\n' || c === '\r')) { out += '\\n'; continue; }
    out += c;
  }
  return out;
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const cleaned  = sanitizeJSONString(stripped);
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('JSON 解析失败：', raw.slice(0, 200));
    return fallback;
  }
}

// ─── 命理分析 ─────────────────────────────────────────────────

export async function generateAnalysis(
  chart: Astrolabe,
  selectedDimensions: Dimension[],
  model: LLMModel = 'claude',
): Promise<ChartAnalysis> {
  const chartText  = chartToPromptText(chart);
  const userPrompt = buildAnalysisPrompt(chartText, selectedDimensions);
  const raw        = await callLLM(ANALYSIS_SYSTEM, userPrompt, model, 8192);

  const fallback: ChartAnalysis = {
    summary: '分析生成失败，请重试。',
    palaceAnalysis: [], mutagenAnalysis: '',
    decadalFortune: '', eventAnalysis: [], keyFeatures: [],
  };

  return parseJSON<ChartAnalysis>(raw, fallback);
}

// ─── 出题 ─────────────────────────────────────────────────────

export async function generateQuiz(
  chart: Astrolabe,
  analysis: ChartAnalysis,
  selectedDimensions: Dimension[],
  model: LLMModel = 'claude',
): Promise<QuizQuestion[]> {
  const chartText  = chartToPromptText(chart);
  const userPrompt = buildQuizPrompt(chartText, analysis.keyFeatures, selectedDimensions);
  const raw        = await callLLM(QUIZ_SYSTEM, userPrompt, model, 6000);

  return parseJSON<QuizQuestion[]>(raw, []);
}
