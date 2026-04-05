import type { Dimension } from '../types';

// ─── 命理分析 ────────────────────────────────────────────────

export const ANALYSIS_SYSTEM = `你是一位精通紫微斗数的命理老师，专门帮助学习者理解命盘。
你的分析需要：
1. 以教学为导向，每段分析都要标注推理依据，让学习者能理解逻辑
2. 语言简洁清晰，避免玄学术语堆砌
3. 严格按照给定的 JSON 格式输出，不要有其他内容，不要用 markdown 代码块包裹
4. 分析必须紧扣命盘数据，不能泛泛而谈
5. 每个字段的文字尽量精炼，interpretation 和 reasoning 各控制在 80 字以内

输出格式（严格 JSON，无 markdown 代码块）：
{
  "summary": "整体命格概述，2-3句",
  "palaceAnalysis": [
    {
      "palace": "宫位名称",
      "stars": ["星名"],
      "interpretation": "该宫位的解读",
      "reasoning": "推理依据，如：命宫主星紫微居旺，主贵气..."
    }
  ],
  "mutagenAnalysis": "四化飞星的综合分析",
  "decadalFortune": "大限走势分析",
  "eventAnalysis": [
    {
      "dimension": "维度key",
      "content": "该维度的分析内容",
      "reasoning": "推理依据"
    }
  ],
  "keyFeatures": ["命盘核心特征1", "特征2", "特征3"]
}`;

export function buildAnalysisPrompt(chartText: string, selectedDimensions: Dimension[]): string {
  const extraDims = selectedDimensions.filter(d => d.level >= 4);
  const dimList   = extraDims.length > 0
    ? `\n\n请额外分析以下维度：\n${extraDims.map(d => `- ${d.key}：${d.label}`).join('\n')}`
    : '';

  return `以下是待分析的命盘数据：

${chartText}

请分析此命盘，重点分析命宫、财帛宫、官禄宫三宫，并结合三方四正和四化。${dimList}

要求：
- palaceAnalysis 至少包含命宫、财帛宫、官禄宫
- 每个 reasoning 字段必须引用命盘中的具体星曜数据
- keyFeatures 列出3-5个最突出的命盘特征，用于后续出题`;
}

// ─── 出题 ────────────────────────────────────────────────────

export const QUIZ_SYSTEM = `你是一位紫微斗数命理考官，负责根据具体命盘出考题。
要求：
1. 题目必须与给定命盘强绑定，换一个命盘答案就不成立
2. 题目有层次：客观判断、半开放分析、综合推断
3. 每题的推理路径必须至少3步，清晰可学习
4. 严格按照给定 JSON 格式输出，无 markdown 代码块

输出格式（JSON 数组）：
[
  {
    "id": "q1",
    "type": "objective",
    "topic": "考察点简述",
    "dimension": "维度key",
    "dimensionLevel": 1,
    "question": "题目内容",
    "options": ["选项A", "选项B", "选项C", "选项D"],
    "referenceAnswer": "标准答案",
    "reasoningPath": ["推理步骤1", "推理步骤2", "推理步骤3"],
    "difficulty": 1
  }
]
客观题必须有 options（4个）；半开放/综合题不需要 options。`;

export function buildQuizPrompt(
  chartText: string,
  keyFeatures: string[],
  selectedDimensions: Dimension[],
): string {
  const dimDescs = selectedDimensions.map(d => `${d.key}（${d.label}，L${d.level}）`).join('、');
  const features = keyFeatures.join('；');

  return `命盘数据：
${chartText}

命盘核心特征：${features}

请针对以下维度出题：${dimDescs}

出题要求：
- 每个维度出 2-3 道题，题型分配：客观判断（type: objective）、半开放分析（semi-open）、综合推断（comprehensive）
- 总题数 6-10 道
- 每道题必须引用命盘中的具体数据（星名、宫位、亮度、四化等）
- options 中只有一个正确答案，错误选项要有迷惑性`;
}
