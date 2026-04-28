import type { ChartAnalysis, Dimension } from '../types';
import type { BaZiAnalysis, CompareAnalysis } from '../types/bazi';
import { chartToPromptText } from './chart-to-text';
import { baziToPromptText } from './bazi-to-text';
import type { Astrolabe } from './iztro-wrapper';
import type { BaZiChart } from '../types/bazi';
import {
  ANALYSIS_SYSTEM, buildAnalysisSystem, buildAnalysisPrompt,
  buildChatSystem,
} from './prompts';
import {
  buildBaziSystem, buildBaziAnalysisPrompt,
  COMPARE_SYSTEM, buildComparePrompt,
} from './bazi-prompts';

export type LLMModel = 'claude' | 'claude-4-6' | 'gemini' | 'gemini-pro' | 'gemini-thinking' | 'gemini-3-flash' | 'gemini-3-pro';

// 本地开发时走 Vite proxy（见 vite.config.ts），线上走 Vercel Serverless Function
const PROXY_URL = '/api/chat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

async function callLLM(
  system: string,
  userMessage: string,
  model: LLMModel,
  maxTokens = 4096,
): Promise<string> {
  return callLLMMulti(system, [{ role: 'user', content: userMessage }], model, maxTokens);
}

async function callLLMMulti(
  system: string,
  messages: ChatMessage[],
  model: LLMModel,
  maxTokens = 4096,
): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      system,
      messages,
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

/** 尝试修复被截断的 JSON（逐步补全尾部括号） */
function repairTruncatedJSON(raw: string): string {
  // 如果已经是合法 JSON 就直接返回
  try { JSON.parse(raw); return raw; } catch { /* continue */ }

  // 去掉末尾不完整的键值对
  let s = raw
    .replace(/,\s*"[^"]*$/, '')        // 末尾半截 key
    .replace(/,\s*"[^"]*":\s*$/, '')   // key 后面没 value
    .replace(/,\s*"[^"]*":\s*"[^"]*$/, '"') // 字符串 value 被截断 → 补引号
    .replace(/,\s*$/, '');              // 末尾逗号

  // 统计未闭合的括号
  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const c of s) {
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '{' || c === '[') stack.push(c);
    if (c === '}' || c === ']') stack.pop();
  }

  // 补全未闭合的括号
  while (stack.length > 0) {
    const open = stack.pop()!;
    s += open === '{' ? '}' : ']';
  }

  return s;
}

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const cleaned  = sanitizeJSONString(stripped);
    return JSON.parse(cleaned) as T;
  } catch {
    // 第二次尝试：修复截断的 JSON
    try {
      const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      const cleaned  = sanitizeJSONString(stripped);
      const repaired = repairTruncatedJSON(cleaned);
      console.warn('JSON 截断已修复，原始长度:', raw.length);
      return JSON.parse(repaired) as T;
    } catch {
      console.error('JSON 解析失败（含修复尝试）：', raw.slice(0, 300));
      return fallback;
    }
  }
}

// ─── 导出提示词 ──────────────────────────────────────────────

export function getAnalysisPrompt(chart: Astrolabe, selectedDimensions: Dimension[]): { system: string; user: string } {
  const chartText    = chartToPromptText(chart);
  const userPrompt   = buildAnalysisPrompt(chartText, selectedDimensions);
  const systemPrompt = selectedDimensions.length > 0 ? buildAnalysisSystem(selectedDimensions) : ANALYSIS_SYSTEM;
  return { system: systemPrompt, user: userPrompt };
}

// ─── 命理分析 ─────────────────────────────────────────────────

export async function generateAnalysis(
  chart: Astrolabe,
  selectedDimensions: Dimension[],
  model: LLMModel = 'claude',
): Promise<ChartAnalysis> {
  const chartText    = chartToPromptText(chart);
  const userPrompt   = buildAnalysisPrompt(chartText, selectedDimensions);
  const systemPrompt = selectedDimensions.length > 0 ? buildAnalysisSystem(selectedDimensions) : ANALYSIS_SYSTEM;
  const raw          = await callLLM(systemPrompt, userPrompt, model, 8192);

  const fallback: ChartAnalysis = {
    summary: '分析生成失败，请重试。',
    palaceAnalysis: [], mutagenAnalysis: '',
    decadalFortune: '', eventAnalysis: [], keyFeatures: [],
  };

  const parsed = parseJSON<ChartAnalysis>(raw, fallback);

  // LLM 可能省略维度裁剪掉的字段，补全默认值防止 UI 崩溃
  return {
    summary:          parsed.summary ?? '',
    palaceAnalysis:   parsed.palaceAnalysis ?? [],
    mutagenAnalysis:  parsed.mutagenAnalysis ?? '',
    decadalFortune:   parsed.decadalFortune ?? '',
    eventAnalysis:    parsed.eventAnalysis ?? [],
    keyFeatures:      parsed.keyFeatures ?? [],
  };
}

// ─── 八字分析 ─────────────────────────────────────────────────

export function getBaziAnalysisPrompt(
  baziChart: BaZiChart,
  selectedDimensions: Dimension[],
): { system: string; user: string } {
  const chartText    = baziToPromptText(baziChart);
  const systemPrompt = selectedDimensions.length > 0 ? buildBaziSystem(selectedDimensions) : buildBaziSystem([]);
  const userPrompt   = buildBaziAnalysisPrompt(chartText, selectedDimensions);
  return { system: systemPrompt, user: userPrompt };
}

export async function generateBaZiAnalysis(
  baziChart: BaZiChart,
  selectedDimensions: Dimension[],
  model: LLMModel = 'claude',
): Promise<BaZiAnalysis> {
  const chartText    = baziToPromptText(baziChart);
  const systemPrompt = selectedDimensions.length > 0 ? buildBaziSystem(selectedDimensions) : buildBaziSystem([]);
  const userPrompt   = buildBaziAnalysisPrompt(chartText, selectedDimensions);
  const raw          = await callLLM(systemPrompt, userPrompt, model, 8192);

  const fallback: BaZiAnalysis = {
    summary: '八字分析生成失败，请重试。',
    dayMasterAnalysis: '', pillarsAnalysis: [],
    tenGodsAnalysis: '', majorRunAnalysis: '',
    eventAnalysis: [], keyFeatures: [],
  };

  const parsed = parseJSON<BaZiAnalysis>(raw, fallback);
  return {
    summary:           parsed.summary ?? '',
    dayMasterAnalysis: parsed.dayMasterAnalysis ?? '',
    pillarsAnalysis:   parsed.pillarsAnalysis ?? [],
    tenGodsAnalysis:   parsed.tenGodsAnalysis ?? '',
    majorRunAnalysis:  parsed.majorRunAnalysis ?? '',
    eventAnalysis:     parsed.eventAnalysis ?? [],
    keyFeatures:       parsed.keyFeatures ?? [],
  };
}

// ─── 紫微 vs 八字 对比 ────────────────────────────────────────

export async function generateCompare(
  ziweiChart: Astrolabe,
  baziChart: BaZiChart,
  ziweiAnalysis: ChartAnalysis,
  baziAnalysis: BaZiAnalysis,
  selectedDimensions: Dimension[],
  model: LLMModel = 'claude',
): Promise<{ result: CompareAnalysis; promptText: string }> {
  const ziweiText  = chartToPromptText(ziweiChart);
  const baziText   = baziToPromptText(baziChart);
  const userPrompt = buildComparePrompt(ziweiText, baziText, ziweiAnalysis, baziAnalysis, selectedDimensions);
  const raw = await callLLM(COMPARE_SYSTEM, userPrompt, model, 6000);

  const fallback: CompareAnalysis = {
    convergence: '', divergence: '', eventSynthesis: [], conclusion: '',
  };

  const parsed = parseJSON<CompareAnalysis>(raw, fallback);
  return {
    result: {
      convergence:    parsed.convergence ?? '',
      divergence:     parsed.divergence ?? '',
      eventSynthesis: parsed.eventSynthesis ?? [],
      conclusion:     parsed.conclusion ?? '',
    },
    promptText: userPrompt,
  };
}

// ─── 自由问答 ────────────────────────────────────────────────

export async function chatWithChart(
  chart: Astrolabe,
  analysis: ChartAnalysis,
  messages: ChatMessage[],
  model: LLMModel = 'gemini',
): Promise<string> {
  const chartText = chartToPromptText(chart);
  const system    = buildChatSystem(chartText, analysis);
  return callLLMMulti(system, messages, model, 4096);
}
