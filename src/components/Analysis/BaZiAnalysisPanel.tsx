import type { BaZiAnalysis } from '../../types/bazi';
import { DIMENSIONS } from '../../types';
import './AnalysisPanel.css';

interface BaZiAnalysisPanelProps {
  analysis: BaZiAnalysis;
}

function dimLabel(key: string): string {
  return DIMENSIONS.find(d => d.key === key)?.label ?? key;
}

export default function BaZiAnalysisPanel({ analysis }: BaZiAnalysisPanelProps) {
  return (
    <div className="analysis-content">
      {/* 总述 */}
      <section className="analysis-section">
        <div className="section-tag">概述</div>
        <p className="analysis-summary">{analysis.summary}</p>
      </section>

      {/* 日主格局 */}
      {analysis.dayMasterAnalysis && (
        <section className="analysis-section">
          <div className="section-tag">日主 · 格局 · 用神</div>
          <p className="analysis-text">{analysis.dayMasterAnalysis}</p>
        </section>
      )}

      {/* 四柱分析 */}
      {analysis.pillarsAnalysis.length > 0 && (
        <section className="analysis-section">
          <div className="section-tag">四柱解读</div>
          {analysis.pillarsAnalysis.map((pa, i) => (
            <div key={i} className="palace-analysis-card">
              <div className="palace-analysis-header">
                <span className="palace-analysis-name">{pa.pillar}</span>
                <span className="palace-analysis-stars">{pa.stems}（{pa.tenGod}）</span>
              </div>
              <p className="palace-analysis-text">{pa.interpretation}</p>
              <div className="reasoning-block">
                <span className="reasoning-label">推理依据</span>
                <p className="reasoning-text">{pa.reasoning}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 十神关系 */}
      {analysis.tenGodsAnalysis && (
        <section className="analysis-section">
          <div className="section-tag">十神格局</div>
          <p className="analysis-text">{analysis.tenGodsAnalysis}</p>
        </section>
      )}

      {/* 大运分析 */}
      {analysis.majorRunAnalysis && (
        <section className="analysis-section">
          <div className="section-tag">当前大运</div>
          <p className="analysis-text">{analysis.majorRunAnalysis}</p>
        </section>
      )}

      {/* 维度分析 */}
      {analysis.eventAnalysis.map((ea, i) => (
        <section key={i} className="analysis-section">
          <div className="section-tag event-tag">{dimLabel(ea.dimension)}</div>
          <p className="analysis-text">{ea.content}</p>
          <div className="reasoning-block">
            <span className="reasoning-label">推理依据</span>
            <p className="reasoning-text">{ea.reasoning}</p>
          </div>
        </section>
      ))}

      {/* 核心特征 */}
      {analysis.keyFeatures.length > 0 && (
        <section className="analysis-section">
          <div className="section-tag">命盘核心特征</div>
          <ul className="key-features">
            {analysis.keyFeatures.map((f, i) => (
              <li key={i} className="key-feature-item">{f}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
