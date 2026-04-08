import type { BaZiChart } from '../../types/bazi';
import './BaZiBoard.css';

interface BaZiBoardProps {
  chart: BaZiChart;
}

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '时柱'] as const;
const TEN_GOD_COLORS: Record<string, string> = {
  '比肩': '#8a7f7f', '劫财': '#c87d8a',
  '食神': '#7bba9a', '伤官': '#5a9a7a',
  '偏财': '#c9a84c', '正财': '#a87a30',
  '七杀': '#d47070', '正官': '#9070d4',
  '偏印': '#70a8d4', '正印': '#4a88c4',
  '日主': '#c87d8a',
};

function tenGodColor(tenGod: string): string {
  return TEN_GOD_COLORS[tenGod] ?? '#8a7f7f';
}

export default function BaZiBoard({ chart }: BaZiBoardProps) {
  const pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];
  const currentRun = chart.majorRuns.find(r => r.isCurrent);

  return (
    <div className="bazi-board">
      {/* 四柱 */}
      <div className="bazi-pillars">
        {pillars.map((p, i) => (
          <div key={i} className="bazi-pillar">
            <div className="bazi-pillar-label">{PILLAR_LABELS[i]}</div>
            <div className="bazi-pillar-stem">{p.stem}</div>
            <div className="bazi-pillar-branch">{p.branch}</div>
            <div
              className="bazi-pillar-tengod"
              style={{ color: tenGodColor(p.tenGod) }}
            >
              {p.tenGod}
            </div>
            <div className="bazi-pillar-nayin">{p.nayin}</div>
            <div className="bazi-pillar-hidden">
              {p.hiddenStems.map((s, j) => (
                <span key={j} className="bazi-hidden-stem">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 日主信息 */}
      <div className="bazi-info-row">
        <div className="bazi-info-item">
          <span className="bazi-info-label">日主</span>
          <span className="bazi-info-value" style={{ color: '#c87d8a' }}>
            {chart.dayMaster}（{chart.dayMasterElement}）
          </span>
        </div>
        {chart.pattern && (
          <div className="bazi-info-item">
            <span className="bazi-info-label">格局</span>
            <span className="bazi-info-value">{chart.pattern}</span>
          </div>
        )}
        {chart.favorableElements.length > 0 && (
          <div className="bazi-info-item">
            <span className="bazi-info-label">喜</span>
            <span className="bazi-info-value" style={{ color: '#7bba9a' }}>
              {chart.favorableElements.join(' ')}
            </span>
          </div>
        )}
        {chart.unfavorableElements.length > 0 && (
          <div className="bazi-info-item">
            <span className="bazi-info-label">忌</span>
            <span className="bazi-info-value" style={{ color: '#d47070' }}>
              {chart.unfavorableElements.join(' ')}
            </span>
          </div>
        )}
      </div>

      {/* 大运 */}
      <div className="bazi-dayun-section">
        <div className="bazi-section-title">大运</div>
        <div className="bazi-dayun-list">
          {chart.majorRuns.filter(r => r.stem).map((r, i) => (
            <div
              key={i}
              className={`bazi-dayun-item${r.isCurrent ? ' bazi-dayun-item--current' : ''}`}
            >
              <div className="bazi-dayun-gz">{r.stem}{r.branch}</div>
              <div
                className="bazi-dayun-tengod"
                style={{ color: tenGodColor(r.tenGod) }}
              >
                {r.tenGod}
              </div>
              <div className="bazi-dayun-age">{r.startAge}–{r.endAge}</div>
            </div>
          ))}
        </div>
        {currentRun && (
          <div className="bazi-current-run">
            当前大运：<span style={{ color: '#c87d8a' }}>{currentRun.stem}{currentRun.branch}</span>
            （{currentRun.tenGod}）{currentRun.startAge}–{currentRun.endAge}岁
          </div>
        )}
      </div>
    </div>
  );
}
