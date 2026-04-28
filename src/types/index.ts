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

/** 紫微斗数专用维度 */
export const ZIWEI_DIMENSIONS: Dimension[] = [
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
];

/** 八字专用维度（L2/L3） */
export const BAZI_SPECIFIC_DIMENSIONS: Dimension[] = [
  // ── 第一层：基础认知 ──
  { key: 'bazi_daymaster',    label: '日主格局',     level: 1 },
  { key: 'bazi_wuxing',       label: '五行分析',     level: 1 },

  // ── 第二层：单柱解读 ──
  { key: 'bazi_pillar_year',  label: '年柱',         level: 2 },
  { key: 'bazi_pillar_month', label: '月柱',         level: 2 },
  { key: 'bazi_pillar_day',   label: '日柱',         level: 2 },
  { key: 'bazi_pillar_hour',  label: '时柱',         level: 2 },

  // ── 第三层：组合技法 ──
  { key: 'bazi_clashes',      label: '合冲刑害',     level: 3 },
  { key: 'bazi_pattern',      label: '格局判断',     level: 3 },
  { key: 'bazi_shenshas',     label: '神煞',         level: 3 },
];

/** 两套系统共享的维度（L1/L4/L5） */
export const SHARED_DIMENSIONS: Dimension[] = [
  // ── 第一层：基础认知（通用） ──
  { key: 'basics',            label: '基础认知',     level: 1 },

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

/** 完整维度列表（紫微 + 共享） */
export const DIMENSIONS: Dimension[] = [
  ...ZIWEI_DIMENSIONS,
  { key: 'decadal',           label: '大限走势',     level: 4 },
  { key: 'yearly',            label: '流年分析',     level: 4 },
  { key: 'monthly',           label: '小限流月',     level: 4 },
  { key: 'career_decision',   label: '事业决策',     level: 5 },
  { key: 'wealth_planning',   label: '财富规划',     level: 5 },
  { key: 'relationship',      label: '感情婚姻',     level: 5 },
  { key: 'health_wellness',   label: '健康养生',     level: 5 },
  { key: 'key_events',        label: '关键事件',     level: 5 },
  { key: 'auspicious',        label: '趋吉避凶',     level: 5 },
];

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
