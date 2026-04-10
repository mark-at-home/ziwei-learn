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
function tgColor(tg: string) { return TEN_GOD_COLORS[tg] ?? '#8a7f7f'; }

const SHENSHA_GOOD = new Set(['天乙贵人', '文昌贵人', '将星', '天德贵人', '月德贵人']);

export default function BaZiBoard({ chart }: BaZiBoardProps) {
  const pillars = [chart.yearPillar, chart.monthPillar, chart.dayPillar, chart.hourPillar];
  const currentRun = chart.majorRuns.find(r => r.isCurrent);

  return (
    <div className="bazi-board">

      {/* ── 四柱主表 ── */}
      <div className="bazi-table">
        {/* 柱标题行 */}
        <div className="bazi-row bazi-row--header">
          <div className="bazi-row-label" />
          {PILLAR_LABELS.map(l => (
            <div key={l} className="bazi-cell bazi-cell--head">{l}</div>
          ))}
        </div>

        {/* 主星（天干十神）*/}
        <div className="bazi-row">
          <div className="bazi-row-label">主星</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell" style={{ color: tgColor(p.tenGod) }}>
              {p.tenGod}
            </div>
          ))}
        </div>

        {/* 天干 */}
        <div className="bazi-row bazi-row--stem">
          <div className="bazi-row-label">天干</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--stem">{p.stem}</div>
          ))}
        </div>

        {/* 地支 */}
        <div className="bazi-row bazi-row--branch">
          <div className="bazi-row-label">地支</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--branch">{p.branch}</div>
          ))}
        </div>

        {/* 藏干 */}
        <div className="bazi-row">
          <div className="bazi-row-label">藏干</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--hidden">
              {p.hiddenStems.map((s, j) => (
                <span key={j} className="bazi-hidden-char">{s}</span>
              ))}
            </div>
          ))}
        </div>

        {/* 副星（藏干十神）*/}
        <div className="bazi-row">
          <div className="bazi-row-label">副星</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--sub">
              {p.hiddenTenGods.map((tg, j) => (
                <span key={j} className="bazi-sub-god" style={{ color: tgColor(tg) }}>{tg}</span>
              ))}
            </div>
          ))}
        </div>

        {/* 纳音 */}
        <div className="bazi-row">
          <div className="bazi-row-label">纳音</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--nayin">{p.nayin}</div>
          ))}
        </div>

        {/* 长生十二神 */}
        <div className="bazi-row">
          <div className="bazi-row-label">十二神</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--dishi">{p.diShi}</div>
          ))}
        </div>

        {/* 神煞 */}
        <div className="bazi-row bazi-row--shensha">
          <div className="bazi-row-label">神煞</div>
          {pillars.map((p, i) => (
            <div key={i} className="bazi-cell bazi-cell--shensha">
              {p.shenSha.length > 0
                ? p.shenSha.map((s, j) => (
                    <span
                      key={j}
                      className="bazi-shensha-tag"
                      style={{ color: SHENSHA_GOOD.has(s) ? '#7bba9a' : '#d47070' }}
                    >
                      {s}
                    </span>
                  ))
                : <span className="bazi-empty">—</span>
              }
            </div>
          ))}
        </div>
      </div>

      {/* ── 日主信息 ── */}
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

      {/* ── 大运 ── */}
      <div className="bazi-dayun-section">
        <div className="bazi-section-title">大运</div>
        <div className="bazi-dayun-list">
          {chart.majorRuns.filter(r => r.stem).map((r, i) => (
            <div
              key={i}
              className={`bazi-dayun-item${r.isCurrent ? ' bazi-dayun-item--current' : ''}`}
            >
              <div className="bazi-dayun-gz">{r.stem}{r.branch}</div>
              <div className="bazi-dayun-tengod" style={{ color: tgColor(r.tenGod) }}>{r.tenGod}</div>
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
