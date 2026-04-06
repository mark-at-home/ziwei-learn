import type { Astrolabe } from './iztro-wrapper';
import { PALACE_ORDER } from './iztro-wrapper';
import type { ChartAnalysis } from '../types';

export interface VerifyWarning {
  type: 'star-palace' | 'mutagen' | 'brightness';
  message: string;
}

/**
 * 从命盘中构建事实索引，用于验证 AI 输出
 */
function buildFactIndex(chart: Astrolabe) {
  // 星曜→宫位 映射
  const starToPalace: Record<string, string> = {};
  // 星曜→亮度 映射
  const starBrightness: Record<string, string> = {};
  // 星曜→四化 映射
  const starMutagen: Record<string, string> = {};
  // 宫位→主星列表
  const palaceStars: Record<string, string[]> = {};

  for (const palace of chart.palaces) {
    const pName = palace.name;
    palaceStars[pName] = [];

    for (const star of palace.majorStars ?? []) {
      starToPalace[star.name] = pName;
      if (star.brightness) starBrightness[star.name] = star.brightness;
      if (star.mutagen) starMutagen[star.name] = star.mutagen;
      palaceStars[pName].push(star.name);
    }

    for (const star of palace.minorStars ?? []) {
      starToPalace[star.name] = pName;
    }
  }

  return { starToPalace, starBrightness, starMutagen, palaceStars };
}

/**
 * 验证 AI 分析结果是否与命盘数据一致
 * 返回不匹配的警告列表
 */
export function verifyAnalysis(chart: Astrolabe, analysis: ChartAnalysis): VerifyWarning[] {
  const { starToPalace, starMutagen } = buildFactIndex(chart);
  const warnings: VerifyWarning[] = [];

  for (const pa of analysis.palaceAnalysis) {
    // 检查该宫位是否存在（AI 可能输出 "官禄宫" 而 PALACE_ORDER 用 "官禄"，需兼容）
    const normalized = pa.palace.replace(/宫$/, '');
    if (!PALACE_ORDER.includes(pa.palace) && !PALACE_ORDER.includes(normalized)) {
      warnings.push({ type: 'star-palace', message: `分析提到了不存在的宫位"${pa.palace}"` });
      continue;
    }

    // 检查 AI 声称的星曜是否确实在该宫位
    for (const starName of pa.stars) {
      const actual = starToPalace[starName];
      if (!actual) {
        // 星名可能包含辅星或别名，跳过
        continue;
      }
      // 兼容 "官禄" vs "官禄宫" 的差异
      const actualNorm = actual.replace(/宫$/, '');
      if (actual !== pa.palace && actualNorm !== normalized && actual !== normalized && actualNorm !== pa.palace) {
        warnings.push({
          type: 'star-palace',
          message: `AI 称"${starName}"在${pa.palace}，但实际在${actual}`,
        });
      }
    }
  }

  // 检查四化分析中的星曜四化归属
  if (analysis.mutagenAnalysis) {
    const mutagenPattern = /([^\s，。、]+?)化(禄|权|科|忌)/g;
    let match;
    while ((match = mutagenPattern.exec(analysis.mutagenAnalysis)) !== null) {
      const [, starName, mutagenType] = match;
      const actual = starMutagen[starName];
      if (actual && actual !== mutagenType) {
        warnings.push({
          type: 'mutagen',
          message: `AI 称"${starName}化${mutagenType}"，但实际是"${starName}化${actual}"`,
        });
      }
    }
  }

  return warnings;
}

/**
 * 生成验证摘要（用于 UI 展示）
 */
export function formatVerifyResult(warnings: VerifyWarning[]): string {
  if (warnings.length === 0) return '验证通过：AI 分析中的星曜、宫位、四化数据与命盘一致。';
  return `发现 ${warnings.length} 处可能的数据不一致：\n${warnings.map((w, i) => `${i + 1}. ${w.message}`).join('\n')}`;
}
