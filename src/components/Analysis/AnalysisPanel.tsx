import type { ChartAnalysis } from '../../types';
import './AnalysisPanel.css';

interface AnalysisPanelProps {
  analysis: ChartAnalysis;
  onStartQuiz: () => void;
  onBack: () => void;
}

export default function AnalysisPanel({ analysis, onStartQuiz, onBack }: AnalysisPanelProps) {
  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>← 返回命盘</button>
        <h2 className="analysis-title">命理分析</h2>
      </div>

      <div className="analysis-content">
        {/* 总述 */}
        <section className="analysis-section">
          <div className="section-tag">概述</div>
          <p className="analysis-summary">{analysis.summary}</p>
        </section>

        {/* 宫位分析 */}
        {analysis.palaceAnalysis.length > 0 && (
          <section className="analysis-section">
            <div className="section-tag">宫位解读</div>
            {analysis.palaceAnalysis.map((pa, i) => (
              <div key={i} className="palace-analysis-card">
                <div className="palace-analysis-header">
                  <span className="palace-analysis-name">{pa.palace}</span>
                  <span className="palace-analysis-stars">{pa.stars.join('、')}</span>
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

        {/* 四化分析 */}
        {analysis.mutagenAnalysis && (
          <section className="analysis-section">
            <div className="section-tag">四化飞星</div>
            <p className="analysis-text">{analysis.mutagenAnalysis}</p>
          </section>
        )}

        {/* 大限走势 */}
        {analysis.decadalFortune && (
          <section className="analysis-section">
            <div className="section-tag">大限走势</div>
            <p className="analysis-text">{analysis.decadalFortune}</p>
          </section>
        )}

        {/* 事件性分析 */}
        {analysis.eventAnalysis.map((ea, i) => (
          <section key={i} className="analysis-section">
            <div className="section-tag event-tag">{ea.dimension}</div>
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

      <div className="analysis-footer">
        <button className="btn-secondary" onClick={onBack}>返回命盘</button>
        <button className="btn-primary" onClick={onStartQuiz}>开始答题 →</button>
      </div>
    </div>
  );
}
