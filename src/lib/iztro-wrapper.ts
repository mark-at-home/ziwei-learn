import { astro } from 'iztro';
import type { IFunctionalAstrolabe } from 'iztro/lib/astro/FunctionalAstrolabe';

export type Astrolabe = IFunctionalAstrolabe;

export const TIME_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 标准宫位名称顺序（用于命盘布局）
export const PALACE_ORDER = [
  '命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '仆役', '官禄', '田宅', '福德', '父母',
];

export type Gender = 'male' | 'female';

/**
 * 根据公历日期生成命盘
 * @param solarDate  'YYYY-MM-DD'
 * @param timeIndex  0=子时 ... 11=亥时
 * @param gender     'male' | 'female'
 */
export function generateChart(solarDate: string, timeIndex: number, gender: Gender): Astrolabe {
  return astro.bySolar(solarDate, timeIndex, gender, true, 'zh-CN');
}

/**
 * 随机生成一个命盘（公历 1940–2000）
 */
export function generateRandomChart(): Astrolabe {
  const year  = 1940 + Math.floor(Math.random() * 61);
  const month = 1    + Math.floor(Math.random() * 12);
  const day   = 1    + Math.floor(Math.random() * 28); // 28日以内保证合法
  const time  = Math.floor(Math.random() * 12);
  const gender: Gender = Math.random() < 0.5 ? 'male' : 'female';
  const date  = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return generateChart(date, time, gender);
}

/**
 * 验证命盘数据完整性
 */
export function validateChart(chart: Astrolabe): boolean {
  if (!chart.palaces || chart.palaces.length !== 12) return false;
  return chart.palaces.every(p => p.name && p.earthlyBranch && p.heavenlyStem);
}

/**
 * 找到命宫
 */
export function getLifePalace(chart: Astrolabe) {
  return chart.palaces.find(p => p.isOriginalPalace);
}

/**
 * 生成命盘唯一标识
 */
export function getChartId(chart: Astrolabe): string {
  return `${chart.solarDate}-${chart.time}-${chart.gender}`;
}

/**
 * 生成命盘简短标签（用于历史记录显示）
 */
export function getChartLabel(chart: Astrolabe): string {
  const genderLabel = (chart.gender === 'male' || chart.gender === '男') ? '男命' : '女命';
  return `${chart.solarDate} ${chart.time} ${genderLabel}`;
}
