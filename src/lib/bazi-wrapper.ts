// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript') as { Solar: LunarJSSolar };

import type { BaZiChart, BaZiMajorRun, BaZiPillar } from '../types/bazi';

// ── 最小类型声明（仅用到的部分）──────────────────────────────
interface LunarJSSolar {
  fromYmdHms(y: number, m: number, d: number, h: number, mi: number, s: number): SolarObj;
}

interface SolarObj {
  getLunar(): LunarObj;
}

interface LunarObj {
  getEightChar(): EightCharObj;
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
  getYear(): string;
  getYearGan(): string;
  getYearZhi(): string;
  getYearHideGan(): string[];
  getYearWuXing(): string;
  getYearNaYin(): string;
  getYearShiShenGan(): string;
  getMonth(): string;
  getMonthGan(): string;
  getMonthZhi(): string;
  getMonthHideGan(): string[];
  getMonthWuXing(): string;
  getMonthNaYin(): string;
  getMonthShiShenGan(): string;
  getDay(): string;
  getDayGan(): string;
  getDayZhi(): string;
  getDayHideGan(): string[];
  getDayWuXing(): string;
  getDayNaYin(): string;
  getDayShiShenGan(): string;
  getTime(): string;
  getTimeGan(): string;
  getTimeZhi(): string;
  getTimeHideGan(): string[];
  getTimeWuXing(): string;
  getTimeNaYin(): string;
  getTimeShiShenGan(): string;
  getYun(gender: number, sect: number): YunObj;
}

// ── 日主五行映射 ───────────────────────────────────────────────
const GAN_ELEMENT: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

// ── 大运十神（根据日主与大运干的关系）────────────────────────
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

function getDaYunTenGod(dayGan: string, yunGan: string): string {
  return TEN_GOD_MAP[dayGan]?.[yunGan] ?? '';
}

function buildPillar(
  ganZhi: string,
  gan: string,
  zhi: string,
  hideGan: string[],
  nayin: string,
  tenGod: string,
): BaZiPillar {
  return { stem: gan, branch: zhi, tenGod, nayin, hiddenStems: hideGan };
}

/**
 * 根据公历生日（含时辰小时）生成八字命盘
 * @param solarDate  'YYYY-MM-DD'
 * @param hour       0–23
 * @param gender     'male' | 'female'
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
  ec.setSect(2); // 使用新派节气划分月柱

  const dayGan = ec.getDayGan();
  const genderCode = gender === 'male' ? 1 : 0;

  const yearPillar  = buildPillar(ec.getYear(),  ec.getYearGan(),  ec.getYearZhi(),  ec.getYearHideGan(),  ec.getYearNaYin(),  ec.getYearShiShenGan());
  const monthPillar = buildPillar(ec.getMonth(), ec.getMonthGan(), ec.getMonthZhi(), ec.getMonthHideGan(), ec.getMonthNaYin(), ec.getMonthShiShenGan());
  const dayPillar   = buildPillar(ec.getDay(),   ec.getDayGan(),   ec.getDayZhi(),   ec.getDayHideGan(),   ec.getDayNaYin(),   '日主');
  const hourPillar  = buildPillar(ec.getTime(),  ec.getTimeGan(),  ec.getTimeZhi(),  ec.getTimeHideGan(),  ec.getTimeNaYin(),  ec.getTimeShiShenGan());

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
    solarDate,
    gender,
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    dayMaster: dayGan,
    dayMasterElement: GAN_ELEMENT[dayGan] ?? '',
    // strength / pattern / favorable 由 LLM 分析，此处留空
    strength: '中和',
    favorableElements: [],
    unfavorableElements: [],
    pattern: '',
    majorRuns,
  };
}

/**
 * 从 iztro 时辰 index（0=子…11=亥）转换为小时数（取中间时刻）
 */
export function timeIndexToHour(index: number): number {
  // 子=0:00, 丑=2:00, 寅=4:00 ... 亥=22:00
  const hours = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 0];
  return hours[index] ?? 0;
}
