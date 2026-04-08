import type { CompareAnalysis } from '../../types/bazi';
import './ComparePanel.css';

interface ComparePanelProps {
  compare: CompareAnalysis;
  onClose: () => void;
}

export default function ComparePanel({ compare, onClose }: ComparePanelProps) {
  return (
    <div className="compare-panel">
      <div className="compare-header">
        <h3 className="compare-title">紫微 × 八字 · 互证分析</h3>
        <button className="compare-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* 共识 */}
      {compare.convergence && (
        <section className="compare-section">
          <div className="compare-tag compare-tag--convergence">两套共识</div>
          <p className="compare-text">{compare.convergence}</p>
        </section>
      )}

      {/* 分歧 */}
      {compare.divergence && (
        <section className="compare-section">
          <div className="compare-tag compare-tag--divergence">分歧解析</div>
          <p className="compare-text">{compare.divergence}</p>
        </section>
      )}

      {/* 事件互证 */}
      {compare.eventSynthesis.length > 0 && (
        <section className="compare-section">
          <div className="compare-tag">事件互证</div>
          <div className="compare-events">
            {compare.eventSynthesis.map((item, i) => (
              <div key={i} className="compare-event-card">
                <div className="compare-event-topic">{item.topic}</div>
                <div className="compare-event-row">
                  <div className="compare-event-system">紫微</div>
                  <p className="compare-event-text">{item.ziwei}</p>
                </div>
                <div className="compare-event-row">
                  <div className="compare-event-system compare-event-system--bazi">八字</div>
                  <p className="compare-event-text">{item.bazi}</p>
                </div>
                <div className="compare-event-synthesis">
                  <span className="compare-synthesis-label">综合</span>
                  <p className="compare-event-text">{item.synthesis}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 结论 */}
      {compare.conclusion && (
        <section className="compare-section">
          <div className="compare-tag compare-tag--conclusion">综合结论</div>
          <p className="compare-text">{compare.conclusion}</p>
        </section>
      )}
    </div>
  );
}
