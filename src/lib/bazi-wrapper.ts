// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript') as { Solar: LunarJSSolar };

import type { BaZiChart, BaZiMajorRun, BaZiPillar } from '../types/bazi';

// ── 最小类型声明 ────────────────────────────────────────────────
interface LunarJSSolar {
  fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): SolarObj;
}
interface SolarObj { getLunar(): LunarObj; }
interface LunarObj {
  getEightChar(): EightCharObj;
  getBaZiShiShenYearZhi(): string[];
  getBaZiShiShenMonthZhi(): string[];
  getBaZiShiShenDayZhi(): string[];
  getBaZiShiShenTimeZhi(): string[];
}
interface DaYunObj {
  getGanZhi(): string;
  getStartAge(): number;
  getEndAge(): number;
  getIndex(): number;
}
interface YunObj {
  getStartYear(): number;
  isForward(): boolean;
  getDaYun(): DaYunObj[];
}
interface EightCharObj {
  setSect(n: number): void;
  getYear(): string; getYearGan(): string; getYearZhi(): string;
  getYearHideGan(): string[]; getYearNaYin(): string; getYearShiShenGan(): string;
  getYearDiShi(): string;
  getMonth(): string; getMonthGan(): string; getMonthZhi(): string;
  getMonthHideGan(): string[]; getMonthNaYin(): string; getMonthShiShenGan(): string;
  getMonthDiShi(): string;
  getDay(): string; getDayGan(): string; getDayZhi(): string;
  getDayHideGan(): string[]; getDayNaYin(): string; getDayShiShenGan(): string;
  getDayDiShi(): string;
  getTime(): string; getTimeGan(): string; getTimeZhi(): string;
  getTimeHideGan(): string[]; getTimeNaYin(): string; getTimeShiShenGan(): string;
  getTimeDiShi(): string;
  getYun(gender: number, sect: number): YunObj;
}

// ── 日主五行 ──────────────────────────────────────────────────
const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// ── 大运十神 ──────────────────────────────────────────────────
const TEN_GOD_MAP: Record<string, Record<string, string>> = {
  甲: { 甲:'比肩', 乙:'劫财', 丙:'食神', 丁:'伤官', 戊:'偏财', 己:'正财', 庚:'七杀', 辛:'正官', 壬:'偏印', 癸:'正印' },
  乙: { 乙:'比肩', 甲:'劫财', 丁:'食神', 丙:'伤官', 己:'偏财', 戊:'正财', 辛:'七杀', 庚:'正官', 癸:'偏印', 壬:'正印' },
  丙: { 丙:'比肩', 丁:'劫财', 戊:'食神', 己:'伤官', 庚:'偏财', 辛:'正财', 壬:'七杀', 癸:'正官', 甲:'偏印', 乙:'正印' },
  丁: { 丁:'比肩', 丙:'劫财', 己:'食神', 戊:'伤官', 辛:'偏财', 庚:'正财', 癸:'七杀', 壬:'正官', 乙:'偏印', 甲:'正印' },
  戊: { 戊:'比肩', 己:'劫财', 庚:'食神', 辛:'伤官', 壬:'偏财', 癸:'正财', 甲:'七杀', 乙:'正官', 丙:'偏印', 丁:'正印' },
  己: { 己:'比肩', 戊:'劫财', 辛:'食神', 庚:'伤官', 癸:'偏财', 壬:'正财', 乙:'七杀', 甲:'正官', 丁:'偏印', 丙:'正印' },
  庚: { 庚:'比肩', 辛:'劫财', 壬:'食神', 癸:'伤官', 甲:'偏财', 乙:'正财', 丙:'七杀', 丁:'正官', 戊:'偏印', 己:'正印' },
  辛: { 辛:'比肩', 庚:'劫财', 癸:'食神', 壬:'伤官', 乙:'偏财', 甲:'正财', 丁:'七杀', 丙:'正官', 己:'偏印', 戊:'正印' },
  壬: { 壬:'比肩', 癸:'劫财', 甲:'食神', 乙:'伤官', 丙:'偏财', 丁:'正财', 戊:'七杀', 己:'正官', 庚:'偏印', 辛:'正印' },
  癸: { 癸:'比肩', 壬:'劫财', 乙:'食神', 甲:'伤官', 丁:'偏财', 丙:'正财', 己:'七杀', 戊:'正官', 辛:'偏印', 庚:'正印' },
};

// ── 神煞计算表 ────────────────────────────────────────────────
// 天乙贵人：依日主天干
const TIANYI_MAP: Record<string, string[]> = {
  甲: ['丑','未'], 戊: ['丑','未'], 庚: ['丑','未'],
  乙: ['子','申'], 己: ['子','申'],
  丙: ['亥','酉'], 丁: ['亥','酉'],
  壬: ['卯','巳'], 癸: ['卯','巳'],
  辛: ['午','寅'],
};
// 文昌贵人：依日主天干
const WENCHANG_MAP: Record<string, string> = {
  甲:'巳', 乙:'午', 丙:'申', 丁:'酉', 戊:'申', 己:'酉', 庚:'亥', 辛:'子', 壬:'寅', 癸:'卯',
};
// 桃花：依年/日地支三合局
const TAOHUA_MAP: Record<string, string> = {
  申:'酉', 子:'酉', 辰:'酉',
  寅:'卯', 午:'卯', 戌:'卯',
  亥:'子', 卯:'子', 未:'子',
  巳:'午', 酉:'午', 丑:'午',
};
// 驿马：依年/日地支
const YIMA_MAP: Record<string, string> = {
  申:'寅', 子:'寅', 辰:'寅',
  寅:'申', 午:'申', 戌:'申',
  亥:'巳', 卯:'巳', 未:'巳',
  巳:'亥', 酉:'亥', 丑:'亥',
};
// 将星：依年/日地支
const JIANGXING_MAP: Record<string, string> = {
  申:'子', 子:'子', 辰:'子',
  寅:'午', 午:'午', 戌:'午',
  亥:'卯', 卯:'卯', 未:'卯',
  巳:'酉', 酉:'酉', 丑:'酉',
};
// 华盖：依年/日地支
const HUAGAI_MAP: Record<string, string> = {
  申:'辰', 子:'辰', 辰:'辰',
  寅:'戌', 午:'戌', 戌:'戌',
  亥:'未', 卯:'未', 未:'未',
  巳:'丑', 酉:'丑', 丑:'丑',
};
// 羊刃：依日主天干
const YANGREN_MAP: Record<string, string> = {
  甲:'卯', 乙:'寅', 丙:'午', 丁:'巳', 戊:'午', 己:'巳', 庚:'酉', 辛:'申', 壬:'子', 癸:'亥',
};

/** 计算每柱的神煞 */
function computeShenSha(dayGan: string, dayZhi: string, yearZhi: string, branchForThisPillar: string): string[] {
  const result: string[] = [];
  const tianyiBranches = TIANYI_MAP[dayGan] ?? [];
  if (tianyiBranches.includes(branchForThisPillar)) result.push('天乙贵人');
  if (WENCHANG_MAP[dayGan] === branchForThisPillar) result.push('文昌贵人');
  if (YANGREN_MAP[dayGan] === branchForThisPillar) result.push('羊刃');
  // 桃花、驿马、将星、华盖 依年支和日支推算，落在哪柱就标在哪柱
  const refBranches = [yearZhi, dayZhi];
  for (const ref of refBranches) {
    if (TAOHUA_MAP[ref]    === branchForThisPillar) { if (!result.includes('桃花'))   result.push('桃花'); }
    if (YIMA_MAP[ref]      === branchForThisPillar) { if (!result.includes('驿马'))   result.push('驿马'); }
    if (JIANGXING_MAP[ref] === branchForThisPillar) { if (!result.includes('将星'))   result.push('将星'); }
    if (HUAGAI_MAP[ref]    === branchForThisPillar) { if (!result.includes('华盖'))   result.push('华盖'); }
  }
  return result;
}

function getDaYunTenGod(dayGan: string, yunGan: string): string {
  return TEN_GOD_MAP[dayGan]?.[yunGan] ?? '';
}

function buildPillar(
  gan: string, zhi: string,
  hideGan: string[], hiddenTenGods: string[],
  nayin: string, tenGod: string, diShi: string,
  dayGan: string, dayZhi: string, yearZhi: string,
): BaZiPillar {
  return {
    stem: gan, branch: zhi, tenGod, nayin,
    hiddenStems: hideGan, hiddenTenGods, diShi,
    shenSha: computeShenSha(dayGan, dayZhi, yearZhi, zhi),
  };
}

/**
 * 根据公历生日（含时辰小时）生成八字命盘
 */
export function generateBaZiChart(
  solarDate: string,
  hour: number,
  gender: 'male' | 'female',
): BaZiChart {
  const [y, m, d] = solarDate.split('-').map(Number);
  const solar = Solar.fromYmdHms(y, m, d, hour, 0, 0);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();
  ec.setSect(2);

  const dayGan  = ec.getDayGan();
  const dayZhi  = ec.getDayZhi();
  const yearZhi = ec.getYearZhi();
  const genderCode = gender === 'male' ? 1 : 0;

  // 副星（藏干十神）来自 lunar 对象
  const hiddenYearTG  = lunar.getBaZiShiShenYearZhi();
  const hiddenMonthTG = lunar.getBaZiShiShenMonthZhi();
  const hiddenDayTG   = lunar.getBaZiShiShenDayZhi();
  const hiddenTimeTG  = lunar.getBaZiShiShenTimeZhi();

  const yearPillar  = buildPillar(ec.getYearGan(),  ec.getYearZhi(),  ec.getYearHideGan(),  hiddenYearTG,  ec.getYearNaYin(),  ec.getYearShiShenGan(), ec.getYearDiShi(),  dayGan, dayZhi, yearZhi);
  const monthPillar = buildPillar(ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthHideGan(), hiddenMonthTG, ec.getMonthNaYin(), ec.getMonthShiShenGan(), ec.getMonthDiShi(), dayGan, dayZhi, yearZhi);
  const dayPillar   = buildPillar(ec.getDayGan(),   ec.getDayZhi(),   ec.getDayHideGan(),   hiddenDayTG,   ec.getDayNaYin(),   '日主',                  ec.getDayDiShi(),   dayGan, dayZhi, yearZhi);
  const hourPillar  = buildPillar(ec.getTimeGan(),  ec.getTimeZhi(),  ec.getTimeHideGan(),  hiddenTimeTG,  ec.getTimeNaYin(),  ec.getTimeShiShenGan(),  ec.getTimeDiShi(),  dayGan, dayZhi, yearZhi);

  // 大运
  const yunObj = ec.getYun(genderCode, 2);
  const daYunList = yunObj.getDaYun();
  const currentYear = new Date().getFullYear();
  const age = currentYear - y;

  const majorRuns: BaZiMajorRun[] = daYunList
    .filter((dy: DaYunObj) => dy.getGanZhi().length === 2)
    .map((dy: DaYunObj, idx: number) => {
      const gz = dy.getGanZhi();
      const gan = gz[0];
      return {
        index: idx,
        startAge: dy.getStartAge(),
        endAge: dy.getEndAge(),
        stem: gan,
        branch: gz[1],
        tenGod: getDaYunTenGod(dayGan, gan),
        isCurrent: age >= dy.getStartAge() && age <= dy.getEndAge(),
      };
    });

  return {
    solarDate, gender,
    yearPillar, monthPillar, dayPillar, hourPillar,
    dayMaster: dayGan,
    dayMasterElement: GAN_ELEMENT[dayGan] ?? '',
    strength: '中和',
    favorableElements: [], unfavorableElements: [],
    pattern: '',
    majorRuns,
  };
}

/**
 * 从 iztro 时辰 index（0=子…11=亥）转换为小时数
 */
export function timeIndexToHour(index: number): number {
  const hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0];
  return hours[index] ?? 0;
}
