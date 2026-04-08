import type { Dimension } from '../types';
import type { BaZiAnalysis, CompareAnalysis } from '../types/bazi';
import type { ChartAnalysis } from '../types';

function currentDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ─── 八字分析 System Prompt ──────────────────────────────────

const BAZI_SYSTEM_BASE = `你是一位拥有三十年实战经验的八字命理老师，精通子平法，擅长将复杂的命理逻辑拆解给学习者。

你的分析原则：
1. **日主强弱是根本**：所有分析必须先确定日主旺衰，再据此判断喜用神与忌神
2. **格局优先**：先判断月令格局（正官格、偏财格、食神格等），格局是命盘层次的核心
3. **十神关系要具体**：不能泛说"有财星"，必须说明是哪柱哪位的何财，与日主的具体关系
4. **大运流年要联动**：大运分析必须说明大运干支对原局的影响（生克合冲）
5. **推理链条完整**：每个结论都要写出"因为A → 所以B → 因此C"的完整推导，不能跳步
6. **避免泛泛而谈**：每句话必须落到具体的干支、十神、五行，不允许出现"运势不错"等空话

严格按照给定的 JSON 格式输出，不要有其他内容，不要用 markdown 代码块包裹。`;

function buildBaziOutputSchema(selectedDimensions: Dimension[]): string {
  const levels = new Set(selectedDimensions.map(d => d.level));
  const hasPillars  = levels.has(2) || selectedDimensions.length === 0;
  const hasTenGods  = levels.has(3) || selectedDimensions.length === 0;
  const hasMajorRun = levels.has(4) || selectedDimensions.length === 0;
  const hasEvent    = selectedDimensions.some(d => d.level >= 4);

  const fields: string[] = [
    `  "summary": "整体命格概述：格局层次、日主强弱、命运主线，3-4句"`,
    `  "dayMasterAnalysis": "日主强弱判断（月令得令/失令、天干透出、地支通根）、格局名称与成立条件、喜用神与忌神五行"`,
  ];

  if (hasPillars) {
    fields.push(`  "pillarsAnalysis": [
    {
      "pillar": "年柱|月柱|日柱|时柱",
      "stems": "干支如甲子",
      "tenGod": "十神",
      "interpretation": "该柱在命盘中的具体含义与影响",
      "reasoning": "推理链：十神特性→与日主关系→宫位含义→对命主的实际影响"
    }
  ]`);
  }

  if (hasTenGods) {
    fields.push(`  "tenGodsAnalysis": "十神关系深度分析：格局成立条件、合冲刑害、喜忌神的力量对比，以及对命主性格与命运的影响"`);
  }

  if (hasMajorRun) {
    fields.push(`  "majorRunAnalysis": "当前大运分析：大运干支与原局的生克关系、大运十神对喜忌的影响、关键流年预测"`);
  }

  if (hasEvent) {
    fields.push(`  "eventAnalysis": [
    {
      "dimension": "维度key",
      "content": "该维度的深度分析",
      "reasoning": "推理依据"
    }
  ]`);
  }

  fields.push(`  "keyFeatures": ["命盘核心特征1", "特征2", "特征3", "特征4", "特征5"]`);

  return `\n\n输出格式（严格 JSON）：\n{\n${fields.join(',\n')}\n}`;
}

export function buildBaziSystem(selectedDimensions: Dimension[]): string {
  return BAZI_SYSTEM_BASE + buildBaziOutputSchema(selectedDimensions);
}

export const BAZI_SYSTEM = BAZI_SYSTEM_BASE + buildBaziOutputSchema([]);

// ─── 八字分析 User Prompt ────────────────────────────────────

export function buildBaziAnalysisPrompt(chartText: string, selectedDimensions: Dimension[]): string {
  const levels = new Set(selectedDimensions.map(d => d.level));
  const hasPillars  = levels.has(2) || selectedDimensions.length === 0;
  const hasTenGods  = levels.has(3) || selectedDimensions.length === 0;
  const hasMajorRun = levels.has(4) || selectedDimensions.length === 0;
  const hasEvent    = selectedDimensions.some(d => d.level >= 4);

  const extraDims = selectedDimensions.filter(d => d.level >= 4);
  const dimList = extraDims.length > 0
    ? `\n\n请额外深入分析以下维度（每个维度须有独立的推理链条）：\n${extraDims.map(d => `- ${d.key}：${d.label}`).join('\n')}`
    : '';

  const pillarDims = selectedDimensions.filter(d => d.level === 2 && d.key.startsWith('bazi_pillar_'));
  const pillarLabels: Record<string, string> = {
    bazi_pillar_year: '年柱', bazi_pillar_month: '月柱',
    bazi_pillar_day: '日柱', bazi_pillar_hour: '时柱',
  };

  const requirements: string[] = [
    'dayMasterAnalysis 必须首先判断日主得令/失令，再确定格局，最后点明喜用忌神',
  ];

  if (hasPillars) {
    const targetPillars = pillarDims.length > 0
      ? pillarDims.map(d => pillarLabels[d.key] ?? d.label).join('、')
      : '年柱、月柱、日柱、时柱';
    requirements.push(`重点分析以下柱：${targetPillars}，每柱须说明十神含义与对日主的生克影响`);
  }

  if (hasTenGods) {
    requirements.push('tenGodsAnalysis 须指出格局的破坏与成就因素，以及合冲刑害的具体效果');
  }

  if (hasMajorRun) {
    requirements.push('majorRunAnalysis 须说明当前大运天干地支分别对原局产生的影响');
  }

  if (!hasPillars) requirements.push('pillarsAnalysis 字段不需要输出，请省略');
  if (!hasTenGods) requirements.push('tenGodsAnalysis 字段不需要输出，请省略');
  if (!hasMajorRun) requirements.push('majorRunAnalysis 字段不需要输出，请省略');
  if (!hasEvent) requirements.push('eventAnalysis 字段不需要输出，请省略');

  requirements.push('keyFeatures 列出5个最突出的八字命盘特征，每个特征须包含具体干支与十神信息');

  return `当前日期：${currentDateStr()}

以下是待分析的八字命盘数据：

${chartText}

请对此八字命盘进行深度分析。${dimList}

分析要求：
${requirements.map(r => `- ${r}`).join('\n')}`;
}

// ─── 紫微 vs 八字 对比分析 ───────────────────────────────────

export const COMPARE_SYSTEM = `你是一位同时精通紫微斗数和八字子平法的命理大师，擅长从两套不同系统的视角对同一命盘进行互证分析。

对比分析原则：
1. **聚焦共识**：两套系统在哪些方面指向相同的人生主线？这些共识具有最高可信度
2. **分析分歧**：两套系统在某维度出现不同判断时，分析各自的逻辑根源，不能简单说谁对谁错
3. **事件互证**：对于具体人生事件（事业、财富、婚姻等），用两套系统分别论证，再给出综合结论
4. **推理具体**：每个结论必须引用具体的紫微星曜/宫位 或 八字干支/十神，不能泛泛而谈

严格按照给定的 JSON 格式输出，不要有其他内容，不要用 markdown 代码块包裹。

输出格式（严格 JSON）：
{
  "convergence": "两套系统共同指向的命主核心特质与人生主线，须引用具体紫微星曜和八字干支",
  "divergence": "两套系统出现不同判断的方面及其原因分析",
  "eventSynthesis": [
    {
      "topic": "事件主题（如事业、财富、婚姻）",
      "ziwei": "紫微斗数对该主题的判断，引用具体宫位与星曜",
      "bazi": "八字对该主题的判断，引用具体干支与十神",
      "synthesis": "综合两套系统的最终判断与建议"
    }
  ],
  "conclusion": "整体综合建议：基于两套系统互证，对命主最重要的3条命理结论"
}`;

export function buildComparePrompt(
  ziweiText: string,
  baziText: string,
  ziweiAnalysis: ChartAnalysis,
  baziAnalysis: BaZiAnalysis,
): string {
  const ziweiSummary = [
    `概述：${ziweiAnalysis.summary}`,
    ziweiAnalysis.mutagenAnalysis ? `四化：${ziweiAnalysis.mutagenAnalysis}` : '',
    `核心特征：${ziweiAnalysis.keyFeatures.join('、')}`,
  ].filter(Boolean).join('\n');

  const baziSummary = [
    `概述：${baziAnalysis.summary}`,
    `日主分析：${baziAnalysis.dayMasterAnalysis}`,
    `核心特征：${baziAnalysis.keyFeatures.join('、')}`,
  ].filter(Boolean).join('\n');

  // 找到两套分析中都有的事件维度
  const ziweiEvents = ziweiAnalysis.eventAnalysis.map(e => e.dimension);
  const baziEvents  = baziAnalysis.eventAnalysis.map(e => e.dimension);
  const commonEvents = [...new Set([...ziweiEvents, ...baziEvents])];

  const eventTopics = commonEvents.length > 0
    ? `\n\n请重点对以下维度进行互证分析：${commonEvents.join('、')}`
    : '';

  return `以下是同一命主的两套命理分析结果。

=== 紫微斗数 ===
${ziweiText}

紫微分析摘要：
${ziweiSummary}

=== 八字 ===
${baziText}

八字分析摘要：
${baziSummary}
${eventTopics}

请从两套系统的视角进行深度互证对比分析。`;
}
