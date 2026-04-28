// ─── 时辰推断 ────────────────────────────────────────────────

/** 用户提供的人生关键信息（结构化表格） */
export interface LifeInfo {
  personality?: string;
  values?: string;
  parents?: string;
  siblings?: string;
  marriage?: string;
  children?: string;
  career?: string;
  wealth?: string;
  property?: string;
  health?: string;
  other?: string;
}

/** 单个时辰候选 */
export interface TimeCandidate {
  timeIndex: number;
  timeName: string;
  hourRange: string;
  /** 该盘独立符合用户描述的概率 0-100。多个盘可以同时高分，互不影响 */
  probability: number;
  matchedAspects: string[];
  conflictAspects: string[];
  reasoning: string;
}

/** 后续澄清问题 */
export interface ClarifyQuestion {
  id: string;
  question: string;
  hint?: string;
  /** 该问题主要用于区分哪些时辰（timeIndex 列表） */
  distinguishes: number[];
}

/** 推断的判决结论 */
export type TimeInferenceVerdict =
  | 'unique'    // 仅有 1 个盘超过阈值 → 确定
  | 'multiple'  // 多个盘超过阈值 → 需要进一步提问区分
  | 'none';     // 无盘超过阈值 → 信息不足，需要补充

/** 一次完整的时辰推断结果 */
export interface TimeInferenceResult {
  candidates: TimeCandidate[];     // 全部 13 个时辰按概率从高到低排序
  threshold: number;               // 入围阈值（默认 70）
  shortlist: number[];             // 通过阈值的 timeIndex 列表
  verdict: TimeInferenceVerdict;
  questions: ClarifyQuestion[];    // multiple/none 时给出区分问题
  reasoning: string;               // 整体推断说明
}
