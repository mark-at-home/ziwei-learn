import type { Astrolabe } from './iztro-wrapper';
import { generateChart, TIME_NAMES, PALACE_ORDER } from './iztro-wrapper';
import type { Gender } from './iztro-wrapper';
import type { LifeInfo, TimeInferenceResult, TimeInferenceVerdict } from '../types/time-inference';
import type { LLMModel } from './claude-api';

const PROXY_URL = '/api/chat';

const HOUR_RANGES = [
  '00:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00',
  '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00',
  '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00',
  '23:00-24:00',
];

/** 通过阈值（≥ 该值视为"高度符合"） */
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
- 50-69：部分事实吻合，但存在 1-2 处明显矛盾
- 30-49：仅少数事实勉强吻合，多处冲突
- 0-29：几乎完全不符合用户描述

# 推理原则

1. **逐宫核对**：不同时辰对应的命盘宫位排列不同。聚焦在用户提供了信息的对应宫位（如提到婚姻就重点核对夫妻宫，事业就核对官禄宫）
2. **避免常识偏见**：不要因某个时辰更常见就给高分，分数必须基于命盘与事实的契合度
3. **诚实评估**：如果信息不足以判断某盘，给中等分数（50-65），而不是猜测高分

# 区分阈值与判决（threshold = 70）

设入围阈值为 70。统计 probability ≥ 70 的盘数：
- **shortlist 长度 = 1**：verdict = "unique"，仅 1 个盘高度符合，可判定为该时辰
- **shortlist 长度 ≥ 2**：verdict = "multiple"，多个盘都高度符合，须给出 2-4 个具体澄清问题，每个问题对应该盘 shortlist 中盘的不同宫位差异，targetAspect 须明确（"夫妻宫" / "官禄宫" 等）
- **shortlist 长度 = 0**：verdict = "none"，无盘高度符合（说明用户信息不充分），须给出 2-3 个开放性问题让用户补充更多关键信息

# 严格按 JSON 输出，无 markdown 代码块

输出格式：
{
  "candidates": [
    {
      "timeIndex": 0,
      "timeName": "时辰中文名",
      "hourRange": "时间范围",
      "probability": 0,
      "matchedAspects": ["契合方面1"],
      "conflictAspects": ["冲突方面1"],
      "reasoning": "≤80字：该盘对用户事实的支持程度与主要矛盾点"
    }
  ],
  "threshold": 70,
  "shortlist": [],
  "verdict": "unique|multiple|none",
  "reasoning": "整体推断结论：说明 shortlist 中各盘的高分支撑点，以及为什么落在 unique/multiple/none 之中",
  "questions": [
    {
      "id": "q1",
      "question": "具体可回答的问题",
      "hint": "回答此问题对哪个宫位的判断最有帮助",
      "distinguishes": [0, 3]
    }
  ]
}

candidates 必须包含全部 13 个时辰；shortlist 是 timeIndex 数组；verdict = "unique" 时 questions 输出空数组 []。`;

function buildTimeInferencePrompt(
  charts: Astrolabe[],
  lifeInfo: LifeInfo,
  solarDate: string,
  gender: Gender,
): string {
  const allChartTexts = charts
    .map((c, i) => `=== 候选 ${i + 1}：${TIME_NAMES[i]}时（timeIndex=${i}）===\n${chartToCompactText(c, i)}`)
    .join('\n\n');

  const lifeText = lifeInfoToText(lifeInfo);
  const genderLabel = gender === 'male' ? '男命' : '女命';

  return `命主信息：公历${solarDate}　${genderLabel}
出生时辰：未知（待推断）

命主提供的人生关键信息：
${lifeText}

以下是该生日 + 性别下，13 个不同时辰对应的紫微斗数命盘（命宫位置随时辰变化，所有 12 宫排列也随之旋转）：

${allChartTexts}

请对每个时辰**独立评估**：假设它是真实命盘，能多大程度上解释用户的全部事实？给出 0-100 的概率分。
**多个时辰可以同时高分**，不要强行拉开差距。
完成后按概率从高到低排序，统计 probability ≥ 70 的 timeIndex 列入 shortlist，据此给出 verdict 与对应 questions。`;
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

function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(stripped) as T;
  } catch (e) {
    console.error('时辰推断 JSON 解析失败：', raw.slice(0, 300), e);
    return fallback;
  }
}

/** 由前端兜底重算 shortlist / verdict，确保与 threshold 一致 */
function normalizeResult(parsed: TimeInferenceResult): TimeInferenceResult {
  const threshold = parsed.threshold || PROBABILITY_THRESHOLD;
  const candidates = [...(parsed.candidates ?? [])].sort((a, b) => b.probability - a.probability);
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

  const raw = await callLLM(TIME_INFERENCE_SYSTEM, userPrompt, model, 8192);

  const fallback: TimeInferenceResult = {
    candidates: [], threshold: PROBABILITY_THRESHOLD, shortlist: [], verdict: 'none',
    questions: [], reasoning: '推断失败，请重试',
  };
  const parsed = parseJSON<TimeInferenceResult>(raw, fallback);
  const result = normalizeResult(parsed);

  return {
    result,
    charts,
    promptText: { system: TIME_INFERENCE_SYSTEM, user: userPrompt },
  };
}

export { HOUR_RANGES };
