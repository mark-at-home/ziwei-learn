import { Lunar } from 'lunar-javascript';

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

/**
 * 农历转公历，返回 'YYYY-MM-DD' 格式字符串
 * 若日期无效（如农历2月30日）返回 null
 */
export function lunarToSolar(lunar: LunarDate): string | null {
  try {
    const l = Lunar.fromYmd(lunar.year, lunar.isLeap ? -lunar.month : lunar.month, lunar.day);
    const solar = l.getSolar();
    const y = solar.getYear();
    const m = String(solar.getMonth()).padStart(2, '0');
    const d = String(solar.getDay()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

/**
 * 判断某农历年月是否有闰月
 */
export function hasLeapMonth(year: number, month: number): boolean {
  try {
    Lunar.fromYmd(year, -month, 1);
    return true;
  } catch {
    return false;
  }
}
