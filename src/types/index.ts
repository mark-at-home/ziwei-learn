// ─── 维度定义（5层递进体系）─────────────────────────────────

export type DimensionLevel = 1 | 2 | 3 | 4 | 5;

export interface DimensionGroup {
  level: DimensionLevel;
  label: string;
  description: string;
}

export const DIMENSION_GROUPS: DimensionGroup[] = [
  { level: 1, label: '基础认知',   description: '星曜分布与主星特质' },
  { level: 2, label: '单宫解读',   description: '十二宫逐宫深入' },
  { level: 3, label: '组合技法',   description: '三方四正、四化、格局' },
  { level: 4, label: '动态运势',   description: '大限、流年、小限' },
  { level: 5, label: '实战应用',   description: '事件预测与趋吉避凶' },
];

export interface Dimension {
  key: string;
  label: string;
  level: DimensionLevel;
}

export const DIMENSIONS: Dimension[] = [
  // ── 第一层：基础认知 ──
  { key: 'chart_structure',   label: '命盘结构',     level: 1 },
  { key: 'major_stars',       label: '主星特质',     level: 1 },

  // ── 第二层：单宫解读 ──
  { key: 'palace_life',       label: '命宫',         level: 2 },
  { key: 'palace_sibling',    label: '兄弟宫',       level: 2 },
  { key: 'palace_spouse',     label: '夫妻宫',       level: 2 },
  { key: 'palace_children',   label: '子女宫',       level: 2 },
  { key: 'palace_wealth',     label: '财帛宫',       level: 2 },
  { key: 'palace_health',     label: '疾厄宫',       level: 2 },
  { key: 'palace_travel',     label: '迁移宫',       level: 2 },
  { key: 'palace_friends',    label: '仆役宫',       level: 2 },
  { key: 'palace_career',     label: '官禄宫',       level: 2 },
  { key: 'palace_property',   label: '田宅宫',       level: 2 },
  { key: 'palace_fortune',    label: '福德宫',       level: 2 },
  { key: 'palace_parents',    label: '父母宫',       level: 2 },

  // ── 第三层：组合技法 ──
  { key: 'trinity',           label: '三方四正',     level: 3 },
  { key: 'mutagen',           label: '四化飞星',     level: 3 },
  { key: 'star_combo',        label: '星曜组合',     level: 3 },
  { key: 'pattern',           label: '格局辨识',     level: 3 },

  // ── 第四层：动态运势 ──
  { key: 'decadal',           label: '大限走势',     level: 4 },
  { key: 'yearly',            label: '流年分析',     level: 4 },
  { key: 'monthly',           label: '小限流月',     level: 4 },

  // ── 第五层：实战应用 ──
  { key: 'career_decision',   label: '事业决策',     level: 5 },
  { key: 'wealth_planning',   label: '财富规划',     level: 5 },
  { key: 'relationship',      label: '感情婚姻',     level: 5 },
  { key: 'health_wellness',   label: '健康养生',     level: 5 },
  { key: 'key_events',        label: '关键事件',     level: 5 },
  { key: 'auspicious',        label: '趋吉避凶',     level: 5 },
];

// ─── 题目 ───────────────────────────────────────────────────

export type QuestionType = 'objective' | 'semi-open' | 'comprehensive';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  topic: string;
  dimension: string;
  dimensionLevel: DimensionLevel;
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
  dimensionLevel: DimensionLevel;
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
  dimensionLevel: DimensionLevel;
  total: number;
  accurate: number;
  rate: number;
  isWeak: boolean;
}
