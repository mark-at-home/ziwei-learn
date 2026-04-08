// ─── 八字命盘 ────────────────────────────────────────────────

export interface BaZiPillar {
  stem: string;        // 天干
  branch: string;      // 地支
  tenGod: string;      // 十神
  nayin: string;       // 纳音
  hiddenStems: string[]; // 藏干
}

export interface BaZiMajorRun {
  index: number;
  startAge: number;
  endAge: number;
  stem: string;
  branch: string;
  tenGod: string;
  isCurrent: boolean;
}

export interface BaZiChart {
  solarDate: string;       // 公历日期
  gender: 'male' | 'female';
  yearPillar: BaZiPillar;
  monthPillar: BaZiPillar;
  dayPillar: BaZiPillar;
  hourPillar: BaZiPillar;
  dayMaster: string;       // 日主天干
  dayMasterElement: string; // 日主五行
  strength: '极强' | '强' | '偏强' | '中和' | '偏弱' | '弱' | '极弱';
  favorableElements: string[]; // 喜用神五行
  unfavorableElements: string[]; // 忌神五行
  pattern: string;         // 格局（如"正官格"）
  majorRuns: BaZiMajorRun[]; // 大运列表
}

// ─── 八字分析 ────────────────────────────────────────────────

export interface BaZiPillarAnalysis {
  pillar: '年柱' | '月柱' | '日柱' | '时柱';
  stems: string;           // 干支组合，如 "甲子"
  tenGod: string;
  interpretation: string;
  reasoning: string;
}

export interface BaZiAnalysis {
  summary: string;
  dayMasterAnalysis: string;     // 日主强弱、用神喜忌
  pillarsAnalysis: BaZiPillarAnalysis[];
  tenGodsAnalysis: string;       // 十神关系与格局
  majorRunAnalysis: string;      // 当前大运
  eventAnalysis: {
    dimension: string;
    content: string;
    reasoning: string;
  }[];
  keyFeatures: string[];
}

// ─── 紫微 vs 八字对比 ────────────────────────────────────────

export interface CompareSynthesisItem {
  topic: string;        // 如"事业"
  ziwei: string;
  bazi: string;
  synthesis: string;    // 综合结论
}

export interface CompareAnalysis {
  convergence: string;           // 两套共同指向
  divergence: string;            // 分歧点
  eventSynthesis: CompareSynthesisItem[];
  conclusion: string;
}
