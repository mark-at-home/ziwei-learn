// ─── 维度定义 ───────────────────────────────────────────────

export type DimensionCategory = 'structural' | 'event';

export interface Dimension {
  key: string;
  label: string;
  category: DimensionCategory;
}

export const DIMENSIONS: Dimension[] = [
  { key: 'life_palace',  label: '命宫主星性格',   category: 'structural' },
  { key: 'trinity',      label: '三方四正格局',   category: 'structural' },
  { key: 'mutagen',      label: '四化飞星分析',   category: 'structural' },
  { key: 'decade',       label: '大限走势',       category: 'structural' },
  { key: 'family',       label: '家世与六亲',     category: 'event' },
  { key: 'career',       label: '学业与事业',     category: 'event' },
  { key: 'wealth',       label: '工作与财运',     category: 'event' },
  { key: 'marriage',     label: '婚姻与感情',     category: 'event' },
  { key: 'health',       label: '身体健康',       category: 'event' },
];

// ─── 题目 ───────────────────────────────────────────────────

export type QuestionType = 'objective' | 'semi-open' | 'comprehensive';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  topic: string;
  dimension: string;
  dimensionCategory: DimensionCategory;
  question: string;
  options?: string[];
  referenceAnswer: string;
  reasoningPath: string[];
  difficulty: 1 | 2 | 3;
}

// ─── 命理分析 ────────────────────────────────────────────────

export interface PalaceAnalysis {
  palace: string;
  stars: string[];
  interpretation: string;
  reasoning: string;
}

export interface EventAnalysis {
  dimension: string;
  content: string;
  reasoning: string;
}

export interface ChartAnalysis {
  summary: string;
  palaceAnalysis: PalaceAnalysis[];
  mutagenAnalysis: string;
  decadalFortune: string;
  eventAnalysis: EventAnalysis[];
  keyFeatures: string[];
}

// ─── 答题记录 ────────────────────────────────────────────────

export type SelfEval = 'accurate' | 'partial' | 'off';

export interface AnswerRecord {
  questionId: string;
  dimension: string;
  dimensionCategory: DimensionCategory;
  userAnswer: string;
  selfEval: SelfEval;
}

export interface QuizSession {
  id: string;
  chartId: string;
  date: string;
  chartSnapshot: string;  // chartToPromptText() 输出
  chartLabel: string;     // 如 "1985-03-15 未时 男命"
  answers: AnswerRecord[];
}

// ─── 进度统计 ────────────────────────────────────────────────

export interface DimensionStats {
  dimension: string;
  label: string;
  dimensionCategory: DimensionCategory;
  total: number;
  accurate: number;
  rate: number;
  isWeak: boolean;
}
