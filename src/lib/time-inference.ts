import type { Astrolabe } from './iztro-wrapper';
import { generateChart, TIME_NAMES, PALACE_ORDER } from './iztro-wrapper';
import type { Gender } from './iztro-wrapper';
import type { LifeInfo, TimeInferenceResult, TimeInferenceVerdict, TimeCandidate } from '../types/time-inference';
import type { LLMModel } from './claude-api';
import { parseLLMJSON } from './json-utils';

const PROXY_URL = '/api/chat';

const HOUR_RANGES = [
  '00:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
  '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
  '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00',
  '23:00-24:00',
];

export const PROBABILITY_THRESHOLD = 70;

export function generateAllTimeCharts(solarDate: string, gender: Gender): Astrolabe[] {
  const charts: Astrolabe[] = [];
  for (let i = 0; i < 13; i++) {
    try {
      charts.push(generateChart(solarDate, i, gender));
    } catch (e) {
      console.warn(`时辰 ${i} 排盘失败`, e);
    }
  }
  return charts;
}

export function chartToCompactText(chart: Astrolabe, timeIndex: number): string {
  const lines: string[] = [];
  lines.push(`时辰：${TIME_NAMES[timeIndex]}时（${HOUR_RANGES[timeIndex]}）`);
  lines.push(`命主：${chart.soul}　身主：${chart.body}　五行局：${chart.fiveElementsClass}`);

  for (const name of PALACE_ORDER) {
    const palace = chart.palaces.find(p => p.name === name);
    if (!palace) continue;

    const stars: string[] = [];
    if (palace.majorStars && palace.majorStars.length > 0) {
      stars.push(...palace.majorStars.map(s => `${s.name}(${s.brightness})${s.mutagen ? '化' + s.mutagen : ''}`));
    } else {
      stars.push('空宫');
    }
    if (palace.minorStars && palace.minorStars.length > 0) {
      stars.push(...palace.minorStars.slice(0, 2).map((s: { name: string }) => s.name));
    }

    const tag = palace.isOriginalPalace ? '★' : palace.isBodyPalace ? '☆' : '';
    lines.push(`${tag}${name}(${palace.heavenlyStem}${palace.earthlyBranch})：${stars.join('·')}`);
  }

  return lines.join('\n');
}

function lifeInfoToText(info: LifeInfo): string {
  const sections: string[] = [];
  if (info.personality) sections.push(`【性格特点】${info.personality}`);
  if (info.values)      sections.push(`【人生观/价值观】${info.values}`);
  if (info.parents)     sections.push(`【父母关系】${info.parents}`);
  if (info.siblings)    sections.push(`【兄弟姐妹】${info.siblings}`);
  if (info.marriage)    sections.push(`【婚姻感情】${info.marriage}`);
  if (info.children)    sections.push(`【子女情况】${info.children}`);
  if (info.career)      sections.push(`【事业经历】${info.career}`);
  if (info.wealth)      sections.push(`【财富状况】${info.wealth}`);
  if (info.property)    sections.push(`【家境/田宅】${info.property}`);
  if (info.health)      sections.push(`【健康疾病】${info.health}`);
  if (info.other)       sections.push(`【其他信息】${info.other}`);
  return sections.join('\n');
}

const TIME_INFERENCE_SYSTEM = `你是一位精通紫微斗数的命理大师，擅长根据命主提供的人生关键信息反推可能的出生时辰。

# 评估方式（极其重要，必须严格遵守）

对每一个时辰候选，你要**独立地**判断"假设这是命主的真实命盘，它在多大程度上能够解释用户提供的所有人生事实？"，给出 0-100 的**独立概率**。

**这是独立评估，不是相对排名**：
- 多个时辰可以同时获得高分（例如多个时辰都得 80+），互不影响
- 不要因为给了 A 高分就压低 B 的分数
- 不要因为认为只该有一个"正确答案"就强行拉开差距

**评分参考**：
- 90-100：所有用户提供的事实都能在该盘中找到强支持，几乎没有矛盾
- 70-89：大部分事实吻合，可能少数细节略有出入但不构成实质冲突
- 50-69：部分事实吻合或信息不足以判断，但存在 1-2 处明显矛盾
- 30-49：仅少数事实勉强吻合，多处冲突
- 0-29：几乎完全不符合用户描述

# 信息不足的处理（务必遵守）

如果用户提供的人生信息很少（例如只填了 1-3 项），**不要拒绝输出**，也不要让所有盘都得低分：
- 仍然必须输出全部 13 个候选
- 对所有可解释信息的盘给 50-65 中等分数（信息不足以判断）
- 对明显有冲突的盘给 30-50
- verdict 通常会落在 "none"，questions 字段须给出 3-4 个开放性问题来获取更多关键信息（如询问婚姻、事业、父母等用户未填写的方面）

# 推理原则

1. **逐宫核对**：不同时辰对应的命盘宫位排列不同，聚焦在用户提供了信息的对应宫位
2. **避免常识偏见**：不要因某个时辰更常见就给高分
3. **诚实评估**：信息不足时给中等分数，不要猜测高分

# 区分阈值与判决（threshold = 70）

设入围阈值为 70。统计 probability ≥ 70 的盘数：
- shortlist 长度 = 1：verdict = "unique"
- shortlist 长度 ≥ 2：verdict = "multiple"，给出 2-4 个具体澄清问题，区分这些盘的不同宫位
- shortlist 长度 = 0：verdict = "none"，给出 2-4 个开放性问题让用户补充信息

# 输出体积控制（务必遵守，避免输出过长被截断）

- 每个候选的 reasoning 控制在 50 字以内
- matchedAspects / conflictAspects 各最多 3 项，每项 ≤ 8 字
- 整体 reasoning 字段控制在 100 字以内
- 单个 question 文本 ≤ 40 字

# 严格按 JSON 输出，无 markdown 代码块，无任何其他文字

输出格式：
{
  "candidates": [
    { "timeIndex": 0, "timeName": "早子", "hourRange": "00:00-01:00", "probability": 0, "matchedAspects": [], "conflictAspects": [], "reasoning": "" }
  ],
  "threshold": 70,
  "shortlist": [],
  "verdict": "unique|multiple|none",
  "reasoning": "",
  "questions": [
    { "id": "q1", "question": "", "hint": "", "distinguishes": [] }
  ]
}

candidates 必须包含全部 13 个 timeIndex（0 到 12）。verdict = "unique" 时 questions 输出 []。`;

function buildTimeInferencePrompt(
  charts: Astrolabe[],
  lifeInfo: LifeInfo,
  solarDate: string,
  gender: Gender,
): string {
  const allChartTexts = charts
    .map((c, i) => `=== timeIndex=${i} ${TIME_NAMES[i]}时 ===\n${chartToCompactText(c, i)}`)
    .join('\n\n');

  const lifeText = lifeInfoToText(lifeInfo);
  const filledCount = Object.values(lifeInfo).filter(v => v && v.trim()).length;
  const sparseHint = filledCount <= 3
    ? `\n\n注意：用户仅填写了 ${filledCount} 项信息，信息较少。请仍输出全部 13 个候选并给出合理概率（多数盘可能落在 40-65 之间），并在 questions 中给出 3-4 个开放性问题询问用户未填写的关键方面。`
    : '';

  const genderLabel = gender === 'male' ? '男命' : '女命';

  return `命主信息：公历${solarDate}　${genderLabel}
出生时辰：未知（待推断）

命主提供的人生关键信息：
${lifeText}${sparseHint}

以下是该生日 + 性别下，13 个不同时辰对应的紫微斗数命盘：

${allChartTexts}

请对每个时辰独立评估并输出 JSON。务必输出全部 13 个 timeIndex（0-12），不要省略。`;
}

async function callLLM(system: string, user: string, model: LLMModel, maxTokens: number): Promise<string> {
  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      system,
      messages: [{ role: 'user', content: user }],
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

/** 用前端逻辑兜底重算 shortlist / verdict，并补齐缺失的候选 */
function normalizeResult(
  parsed: Partial<TimeInferenceResult>,
  charts: Astrolabe[],
): TimeInferenceResult {
  const threshold = parsed.threshold || PROBABILITY_THRESHOLD;
  const rawCandidates = parsed.candidates ?? [];

  // 按 timeIndex 索引现有候选
  const byIndex = new Map<number, TimeCandidate>();
  for (const c of rawCandidates) {
    if (typeof c.timeIndex === 'number') byIndex.set(c.timeIndex, c);
  }

  // 补齐缺失的候选（LLM 截断时常常少几个）
  const candidates: TimeCandidate[] = [];
  for (let i = 0; i < charts.length; i++) {
    const existing = byIndex.get(i);
    if (existing) {
      candidates.push({
        timeIndex: i,
        timeName: existing.timeName ?? TIME_NAMES[i],
        hourRange: existing.hourRange ?? HOUR_RANGES[i],
        probability: typeof existing.probability === 'number' ? existing.probability : 50,
        matchedAspects: existing.matchedAspects ?? [],
        conflictAspects: existing.conflictAspects ?? [],
        reasoning: existing.reasoning ?? '',
      });
    } else {
      candidates.push({
        timeIndex: i,
        timeName: TIME_NAMES[i],
        hourRange: HOUR_RANGES[i],
        probability: 50,
        matchedAspects: [],
        conflictAspects: [],
        reasoning: '（模型输出截断，未给出具体评估）',
      });
    }
  }

  candidates.sort((a, b) => b.probability - a.probability);
  const shortlist = candidates.filter(c => c.probability >= threshold).map(c => c.timeIndex);
  const verdict: TimeInferenceVerdict =
    shortlist.length === 1 ? 'unique' : shortlist.length >= 2 ? 'multiple' : 'none';

  return {
    candidates,
    threshold,
    shortlist,
    verdict,
    questions: parsed.questions ?? [],
    reasoning: parsed.reasoning ?? '',
  };
}

export async function inferBirthTime(
  solarDate: string,
  gender: Gender,
  lifeInfo: LifeInfo,
  model: LLMModel = 'gemini-pro',
): Promise<{ result: TimeInferenceResult; charts: Astrolabe[]; promptText: { system: string; user: string } }> {
  const charts = generateAllTimeCharts(solarDate, gender);
  const userPrompt = buildTimeInferencePrompt(charts, lifeInfo, solarDate, gender);

  // 13 个候选 + 推理 + 问题。schema 已精简，8192 足够；Claude 默认 cap 也是 8192
  const raw = await callLLM(TIME_INFERENCE_SYSTEM, userPrompt, model, 8192);

  const parsed = parseLLMJSON<Partial<TimeInferenceResult>>(raw, {});
  const result = normalizeResult(parsed, charts);

  // 如果 candidates 全部使用兜底默认值（probability=50 且 reasoning 为空），视为彻底失败
  const allFallback = result.candidates.every(c => c.probability === 50 && !c.reasoning.trim());
  if (allFallback) {
    throw new Error('模型未返回有效结果，请稍后重试或换一个模型');
  }

  return {
    result,
    charts,
    promptText: { system: TIME_INFERENCE_SYSTEM, user: userPrompt },
  };
}

export { HOUR_RANGES };
