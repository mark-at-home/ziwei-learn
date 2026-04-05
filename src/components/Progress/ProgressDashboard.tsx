import { getDimensionStats, loadSessions } from '../../lib/storage';
import { DIMENSION_GROUPS } from '../../types';
import type { DimensionLevel } from '../../types';
import './Progress.css';

interface ProgressDashboardProps {
  onBack: () => void;
}

export default function ProgressDashboard({ onBack }: ProgressDashboardProps) {
  const stats    = getDimensionStats().filter(s => s.total > 0);
  const sessions = loadSessions();

  const statsByLevel = DIMENSION_GROUPS
    .map(g => ({
      ...g,
      items: stats.filter(s => s.dimensionLevel === g.level),
    }))
    .filter(g => g.items.length > 0);

  return (
    <div className="progress-page">
      <div className="progress-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h2 className="progress-title">学习进度</h2>
      </div>

      <div className="progress-content">
        {stats.length === 0 ? (
          <div className="progress-empty">
            <p>尚无答题记录</p>
            <p className="progress-empty-sub">完成一套题目后，进度将在这里显示</p>
          </div>
        ) : (
          <>
            {statsByLevel.map(group => (
              <section key={group.level} className="progress-section">
                <div className="section-tag">
                  L{group.level} · {group.label}
                  <span className="section-tag-desc">{group.description}</span>
                </div>
                {group.items.map(s => (
                  <DimBar key={s.dimension} stat={s} />
                ))}
              </section>
            ))}
          </>
        )}

        {/* 历史记录 */}
        {sessions.length > 0 && (
          <section className="progress-section">
            <div className="section-tag">历史记录</div>
            {sessions.map(session => (
              <div key={session.id} className="history-card">
                <div className="history-label">{session.chartLabel}</div>
                <div className="history-date">{new Date(session.date).toLocaleDateString('zh-CN')}</div>
                <div className="history-count">{session.answers.length} 题</div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function DimBar({ stat }: { stat: ReturnType<typeof getDimensionStats>[number] }) {
  const pct = Math.round(stat.rate * 100);
  return (
    <div className={`dim-bar ${stat.isWeak ? 'dim-bar--weak' : ''}`}>
      <div className="dim-bar-header">
        <span className="dim-bar-label">
          {stat.isWeak && <span className="weak-icon">⚠ </span>}
          {stat.label}
        </span>
        <span className="dim-bar-pct">{pct}%</span>
      </div>
      <div className="dim-bar-track">
        <div
          className="dim-bar-fill"
          style={{ width: `${pct}%`, background: stat.isWeak ? '#8b1a1a' : '#4a8c5c' }}
        />
      </div>
      <div className="dim-bar-sub">{stat.accurate} / {stat.total} 题准确</div>
    </div>
  );
}
