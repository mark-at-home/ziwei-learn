import type { BaZiChart } from '../types/bazi';

/**
 * 将八字命盘转换为 LLM 友好的文字格式
 */
export function baziToPromptText(chart: BaZiChart): string {
  const { yearPillar, monthPillar, dayPillar, hourPillar, dayMaster, dayMasterElement, majorRuns } = chart;

  const currentRun = majorRuns.find(r => r.isCurrent);

  const pillarLine = (label: string, p: typeof yearPillar) =>
    `${label}：${p.stem}${p.branch}（${p.tenGod}）纳音[${p.nayin}] 藏干[${p.hiddenStems.join('、')}]`;

  const lines: string[] = [
    `=== 八字命盘 ===`,
    `性别：${chart.gender === 'male' ? '男' : '女'}`,
    `公历生日：${chart.solarDate}`,
    ``,
    `── 四柱 ──`,
    pillarLine('年柱', yearPillar),
    pillarLine('月柱', monthPillar),
    pillarLine('日柱', dayPillar),
    pillarLine('时柱', hourPillar),
    ``,
    `── 日主 ──`,
    `日主：${dayMaster}（${dayMasterElement}）`,
    ``,
    `── 大运列表 ──`,
    ...majorRuns.map(r =>
      `${r.startAge}–${r.endAge}岁：${r.stem}${r.branch}（${r.tenGod}）${r.isCurrent ? ' ← 当前大运' : ''}`
    ),
  ];

  if (currentRun) {
    lines.push(``, `── 当前大运 ──`, `${currentRun.stem}${currentRun.branch} 运（${currentRun.tenGod}），${currentRun.startAge}–${currentRun.endAge}岁`);
  }

  return lines.join('\n');
}
