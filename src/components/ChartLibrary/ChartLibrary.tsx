import { useState } from 'react';
import { loadChartLibrary, deleteChartRecord, getSessionsByChart } from '../../lib/storage';
import type { ChartRecord } from '../../lib/storage';
import './ChartLibrary.css';

interface ChartLibraryProps {
  onSelect: (chartId: string) => void;
  onBack: () => void;
}

export default function ChartLibrary({ onSelect, onBack }: ChartLibraryProps) {
  const [library, setLibrary] = useState<ChartRecord[]>(loadChartLibrary);

  function handleDelete(chartId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('确认删除此命盘记录？')) return;
    deleteChartRecord(chartId);
    setLibrary(loadChartLibrary());
  }

  return (
    <div className="library-page">
      <div className="library-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h2 className="library-title">命盘库</h2>
        <span className="library-count">{library.length} 个命盘</span>
      </div>

      <div className="library-content">
        {library.length === 0 ? (
          <div className="library-empty">
            <p>尚无保存的命盘</p>
            <p className="library-empty-sub">排盘后会自动保存到命盘库</p>
          </div>
        ) : (
          library.map(record => {
            const sessions = getSessionsByChart(record.chartId);
            const totalAnswered = sessions.reduce((n, s) => n + s.answers.length, 0);
            const dimsDone = [...new Set(sessions.flatMap(s => s.answers.map(a => a.dimension)))];

            return (
              <div
                key={record.chartId}
                className="library-card"
                onClick={() => onSelect(record.chartId)}
              >
                <div className="library-card-main">
                  <div className="library-card-label">{record.label}</div>
                  <div className="library-card-meta">
                    <span>{record.solarDate}</span>
                    <span className="dot">·</span>
                    <span>保存于 {new Date(record.savedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                  {totalAnswered > 0 && (
                    <div className="library-card-progress">
                      已答 {totalAnswered} 题 · {dimsDone.length} 个维度
                    </div>
                  )}
                </div>
                <div className="library-card-actions">
                  {totalAnswered > 0 && (
                    <span className="library-badge">已学习</span>
                  )}
                  <button
                    className="library-delete-btn"
                    onClick={e => handleDelete(record.chartId, e)}
                    title="删除"
                  >✕</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
