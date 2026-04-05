import type { Astrolabe } from './iztro-wrapper';
import { PALACE_ORDER } from './iztro-wrapper';

/**
 * 将 iztro 命盘数据转换为 LLM 友好的结构化文字
 * 输出质量直接影响 AI 分析和出题质量，务必完整准确
 */
export function chartToPromptText(chart: Astrolabe): string {
  const lines: string[] = [];
  const genderLabel = chart.gender === 'male' ? '男命' : '女命';

  // 基础信息
  lines.push(`【基础信息】公历${chart.solarDate}，农历${chart.lunarDate}，${chart.time}，${genderLabel}`);
  lines.push(`【命主】命主星：${chart.soul}，身主星：${chart.body}，五行局：${chart.fiveElementsClass}`);

  // 十二宫（按标准顺序输出）
  for (const palaceName of PALACE_ORDER) {
    const palace = chart.palaces.find(p => p.name === palaceName);
    if (!palace) continue;

    const parts: string[] = [];
    parts.push(`${palace.heavenlyStem}${palace.earthlyBranch}宫`);

    // 主星
    if (palace.majorStars && palace.majorStars.length > 0) {
      const starDescs = palace.majorStars.map(s => {
        const mutagen = s.mutagen ? `化${s.mutagen}` : '';
        return `${s.name}（${s.brightness}${mutagen ? '·' + mutagen : ''}）`;
      });
      parts.push(`主星：${starDescs.join('、')}`);
    } else {
      parts.push('主星：无（空宫）');
    }

    // 辅星（取前4颗）
    if (palace.minorStars && palace.minorStars.length > 0) {
      const names = palace.minorStars.slice(0, 4).map((s: { name: string }) => s.name);
      parts.push(`辅星：${names.join('、')}`);
    }

    // 大限
    if (palace.decadal?.range) {
      parts.push(`大限：${palace.decadal.range[0]}-${palace.decadal.range[1]}岁`);
    }

    // 命宫/身宫标识
    const tags: string[] = [];
    if (palace.isOriginalPalace) tags.push('★命宫');
    if (palace.isBodyPalace)     tags.push('☆身宫');

    const tagStr = tags.length > 0 ? `[${tags.join('/')}] ` : '';
    lines.push(`【${palaceName}】${tagStr}${parts.join('，')}`);
  }

  // 四化汇总（从所有宫位的主星中提取）
  const mutagenList: string[] = [];
  for (const palace of chart.palaces) {
    for (const star of palace.majorStars ?? []) {
      if (star.mutagen) {
        mutagenList.push(`${star.name}化${star.mutagen}（落${palace.name}）`);
      }
    }
  }
  if (mutagenList.length > 0) {
    lines.push(`【本命四化】${mutagenList.join('，')}`);
  }

  return lines.join('\n');
}
