import type { Astrolabe } from './iztro-wrapper';
import { generateChart, TIME_NAMES, PALACE_ORDER } from './iztro-wrapper';
import type { Gender } from './iztro-wrapper';
import type {
  LifeInfo, TimeInferenceResult, TimeInferenceVerdict, TimeCandidate, ClarifyQuestion,
} from '../types/time-inference';
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

/** 把 13 个时辰拆分为 4 批分别评估，避免单次输出过长被截断 */
const BATCHES: number[][] = [
  [0, 1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [10, 11, 12],
];

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
  // 客观事实优先（按形式重要性排序）
  if (info.parents)     sections.push(`【父母情况】${info.parents}`);
  if (info.siblings)    sections.push(`【兄弟姐妹】${info.siblings}`);
  if (info.marriage)    sections.push(`【婚姻关键事件】${info.marriage}`);
  if (info.children)    sections.push(`【子女关键事件】${info.children}`);
  if (info.career)      sections.push(`【事业关键事件】${info.career}`);
  if (info.wealth)      sections.push(`【财富关键事件】${info.wealth}`);
  if (info.property)    sections.push(`【居住与家境】${info.property}`);
  if (info.health)      sections.push(`【重大疾病/意外】${info.health}`);
  // 主观补充
  if (info.personality) sections.push(`【性格特点（主观）】${info.personality}`);
  if (info.values)      sections.push(`【人生追求（主观）】${info.values}`);
  if (info.other)       sections.push(`【其他信息】${info.other}`);
  return sections.join('\n');
}

// ─── 批次评估（每次只评本批的若干个时辰）────────────────────────

const BATCH_SYSTEM = `你是一位精通紫微斗数的命理大师，擅长根据命主提供的人生关键信息反推可能的出生时辰。

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

# 信息不足的处理

如果用户提供的人生信息很少（例如只填了 1-3 项），不要拒绝输出，对所有可解释信息的盘给 50-65 中等分数。

# 推理原则

1. **以客观事实为主、主观感受为辅**：用户提供的事实大多带有年龄/年份（"30岁结婚"、"父亲在我15岁时去世"、"32岁购房"等）。这些是反推的核心，主观性格描述仅作为辅助参考。
2. **年龄事件优先用流年/大限对照**：把事件年龄换算到对应大限/流年宫位（命主出生年龄即生年；逐宫推 10 年大限），核对该宫宫干四化、星曜配置是否能解释该事件。如能解释，强证据；不能解释或矛盾，扣分。
3. **空缺信息不要脑补**：用户没有提到的事项（例如未提子女）不要假设它没有发生，也不要凭主观印象给分。
4. **逐宫核对**：聚焦在用户提供了信息的对应宫位（婚姻↔夫妻宫，事业↔官禄宫，疾病↔疾厄宫，家境↔田宅宫，等）。
5. **避免常识偏见**：不要因某个时辰更常见就给高分。
6. **诚实评估**：信息不足时给中等分数，不要猜测高分。

# 输出体积控制

- reasoning 控制在 80 字以内，结合具体宫位/星曜说明依据
- matchedAspects / conflictAspects 各最多 4 项，每项 ≤ 12 字

# 严格按 JSON 输出，无 markdown 代码块，无任何其他文字

输出格式（candidates 只包含本批次给定的 timeIndex，按要求顺序）：
{
  "candidates": [
    { "timeIndex": 0, "timeName": "早子", "hourRange": "00:00-01:00", "probability": 0, "matchedAspects": [], "conflictAspects": [], "reasoning": "" }
  ]
}`;

function buildBatchPrompt(
  charts: Astrolabe[],
  batchIndices: number[],
  lifeInfo: LifeInfo,
  solarDate: string,
  gender: Gender,
): string {
  const chartTexts = batchIndices
    .map(i => `=== timeIndex=${i} ${TIME_NAMES[i]}时 ===\n${chartToCompactText(charts[i], i)}`)
    .join('\n\n');

  const lifeText = lifeInfoToText(lifeInfo);
  const filledCount = Object.values(lifeInfo).filter(v => v && v.trim()).length;
  const sparseHint = filledCount <= 3
    ? `\n\n注意：用户仅填写了 ${filledCount} 项信息，信息较少。请对所有可解释信息的盘给 50-65 之间的中等分数，明显冲突的盘给更低分。`
    : '';

  const genderLabel = gender === 'male' ? '男命' : '女命';

  return `命主信息：公历${solarDate}　${genderLabel}
出生时辰：未知（待推断）

命主提供的人生关键信息：
${lifeText}${sparseHint}

以下是本批次需要评估的 ${batchIndices.length} 张候选命盘（timeIndex: ${batchIndices.join(', ')}）：

${chartTexts}

请对本批次每个 timeIndex 独立评估并输出 JSON。务必输出全部 ${batchIndices.length} 个候选，timeIndex 必须严格匹配上方列出的：${batchIndices.join(', ')}。`;
}

// ─── 综合澄清问题（仅在非 unique 时调用）────────────────────────

const SYNTHESIS_SYSTEM = `你是紫微斗数专家。给定 13 个时辰候选的概率评分结果，请输出整体说明和澄清问题。

任务：
- 若 verdict = "multiple"：针对入围的多个盘（probability ≥ threshold），给出 2-4 个能够区分它们的具体问题
- 若 verdict = "none"：给出 2-4 个开放性问题，引导用户补充关键人生事实

# 提问优先级（务必遵守）

1. **优先索取客观事实**：年龄+具体事件最有用，例如"是否在 X 岁前后有 Y 类事件？"、"父母现在是否健在，分别在你几岁时去世？"、"第一次买房在几岁？"、"是否有过大手术或重大疾病？发生时年龄？"
2. **次选具体宫位的客观对照**：例如询问对应大限/流年内的事件，用以区分入围盘在某宫的差异。
3. **仅在客观事实问无可问时**才询问主观感受（性格、价值观等）。

每个问题须包含：id（q1, q2…）、question（≤ 40 字）、hint（≤ 30 字，说明为何问）、distinguishes（该问题主要用于区分的 timeIndex 列表）。

reasoning 字段控制在 100 字以内，总结当前评估的整体格局。

严格按 JSON 输出，无 markdown 代码块：
{
  "reasoning": "",
  "questions": [
    { "id": "q1", "question": "", "hint": "", "distinguishes": [] }
  ]
}`;

function buildSynthesisPrompt(
  candidates: TimeCandidate[],
  lifeInfo: LifeInfo,
  threshold: number,
  verdict: TimeInferenceVerdict,
): string {
  const lifeText = lifeInfoToText(lifeInfo);
  const summary = candidates
    .map(c => `- timeIndex=${c.timeIndex} ${c.timeName}时（${c.hourRange}）：probability=${c.probability}` +
      (c.matchedAspects.length ? `；吻合：${c.matchedAspects.join('、')}` : '') +
      (c.conflictAspects.length ? `；冲突：${c.conflictAspects.join('、')}` : ''))
    .join('\n');

  const shortlist = candidates.filter(c => c.probability >= threshold).map(c => c.timeIndex);

  return `当前评估结果（threshold=${threshold}，verdict=${verdict}）：
入围 timeIndex：[${shortlist.join(', ')}]

候选概览：
${summary}

用户已提供的人生信息：
${lifeText || '（信息很少）'}

请按 JSON 输出 reasoning 和 questions。`;
}

// ─── LLM 调用 ────────────────────────────────────────────────

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

async function evaluateBatch(
  charts: Astrolabe[],
  batchIndices: number[],
  lifeInfo: LifeInfo,
  solarDate: string,
  gender: Gender,
  model: LLMModel,
): Promise<TimeCandidate[]> {
  const userPrompt = buildBatchPrompt(charts, batchIndices, lifeInfo, solarDate, gender);
  try {
    const raw = await callLLM(BATCH_SYSTEM, userPrompt, model, 4096);
    const parsed = parseLLMJSON<{ candidates?: Partial<TimeCandidate>[] }>(raw, {});
    return (parsed.candidates ?? []).filter(c => typeof c.timeIndex === 'number') as TimeCandidate[];
  } catch (e) {
    console.warn(`批次 [${batchIndices.join(',')}] 评估失败`, e);
    return [];
  }
}

async function synthesizeQuestions(
  candidates: TimeCandidate[],
  lifeInfo: LifeInfo,
  threshold: number,
  verdict: TimeInferenceVerdict,
  model: LLMModel,
): Promise<{ reasoning: string; questions: ClarifyQuestion[] }> {
  const userPrompt = buildSynthesisPrompt(candidates, lifeInfo, threshold, verdict);
  try {
    const raw = await callLLM(SYNTHESIS_SYSTEM, userPrompt, model, 1500);
    const parsed = parseLLMJSON<{ reasoning?: string; questions?: ClarifyQuestion[] }>(raw, {});
    return {
      reasoning: parsed.reasoning ?? '',
      questions: parsed.questions ?? [],
    };
  } catch (e) {
    console.warn('问题合成失败', e);
    return { reasoning: '', questions: [] };
  }
}

// ─── 合并 / 兜底 ─────────────────────────────────────────────

function fillMissingCandidates(
  byIndex: Map<number, TimeCandidate>,
  total: number,
): TimeCandidate[] {
  const out: TimeCandidate[] = [];
  for (let i = 0; i < total; i++) {
    const existing = byIndex.get(i);
    if (existing) {
      out.push({
        timeIndex: i,
        timeName: existing.timeName ?? TIME_NAMES[i],
        hourRange: existing.hourRange ?? HOUR_RANGES[i],
        probability: typeof existing.probability === 'number' ? existing.probability : 50,
        matchedAspects: existing.matchedAspects ?? [],
        conflictAspects: existing.conflictAspects ?? [],
        reasoning: existing.reasoning ?? '',
      });
    } else {
      out.push({
        timeIndex: i,
        timeName: TIME_NAMES[i],
        hourRange: HOUR_RANGES[i],
        probability: 50,
        matchedAspects: [],
        conflictAspects: [],
        reasoning: '（该批次输出异常，未给出具体评估）',
      });
    }
  }
  return out;
}

// ─── 主入口 ─────────────────────────────────────────────────

export async function inferBirthTime(
  solarDate: string,
  gender: Gender,
  lifeInfo: LifeInfo,
  model: LLMModel = 'gemini-pro',
): Promise<{ result: TimeInferenceResult; charts: Astrolabe[]; promptText: { system: string; user: string } }> {
  const charts = generateAllTimeCharts(solarDate, gender);

  // 4 批并行评估候选
  const batchResults = await Promise.all(
    BATCHES.map(idx => evaluateBatch(charts, idx, lifeInfo, solarDate, gender, model)),
  );

  // 合并到 byIndex
  const byIndex = new Map<number, TimeCandidate>();
  for (const batch of batchResults) {
    for (const c of batch) {
      if (typeof c.timeIndex === 'number') byIndex.set(c.timeIndex, c);
    }
  }

  const candidates = fillMissingCandidates(byIndex, charts.length);
  candidates.sort((a, b) => b.probability - a.probability);

  const threshold = PROBABILITY_THRESHOLD;
  const shortlist = candidates.filter(c => c.probability >= threshold).map(c => c.timeIndex);
  const verdict: TimeInferenceVerdict =
    shortlist.length === 1 ? 'unique' : shortlist.length >= 2 ? 'multiple' : 'none';

  // 全部批次都失败时报错
  const allFallback = candidates.every(c =>
    c.probability === 50 && (!c.reasoning.trim() || c.reasoning.startsWith('（该批次输出异常')),
  );
  if (allFallback) {
    throw new Error('模型未返回有效结果，请稍后重试或换一个模型');
  }

  // unique 直接结束；multiple/none 再调用一次合成澄清问题
  let reasoning = '';
  let questions: ClarifyQuestion[] = [];
  if (verdict !== 'unique') {
    const synth = await synthesizeQuestions(candidates, lifeInfo, threshold, verdict, model);
    reasoning = synth.reasoning;
    questions = synth.questions;
  }

  // 用首批的 prompt 作为代表（promptText 当前未在 UI 中消费，保留接口形状）
  const representativeUser = buildBatchPrompt(charts, BATCHES[0], lifeInfo, solarDate, gender);

  return {
    result: { candidates, threshold, shortlist, verdict, reasoning, questions },
    charts,
    promptText: { system: BATCH_SYSTEM, user: representativeUser },
  };
}

export { HOUR_RANGES };
