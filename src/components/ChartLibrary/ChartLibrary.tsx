import { useState } from 'react';
import { loadChartLibrary, deleteChartRecord, getSessionsByChart, updateChartNickname } from '../../lib/storage';
import type { ChartRecord } from '../../lib/storage';
import './ChartLibrary.css';

interface ChartLibraryProps {
  onSelect: (chartId: string) => void;
  onBack: () => void;
}

export default function ChartLibrary({ onSelect, onBack }: ChartLibraryProps) {
  const [library, setLibrary] = useState<ChartRecord[]>(loadChartLibrary);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName]   = useState('');

  function handleDelete(chartId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('确认删除此命盘记录？')) return;
    deleteChartRecord(chartId);
    setLibrary(loadChartLibrary());
  }

  function startRename(chartId: string, current: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(chartId);
    setEditName(current);
  }

  function confirmRename(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (editingId) {
      updateChartNickname(editingId, editName.trim());
      setLibrary(loadChartLibrary());
      setEditingId(null);
    }
  }

  function cancelRename(e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(null);
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
            const isEditing = editingId === record.chartId;

            return (
              <div
                key={record.chartId}
                className="library-card"
                onClick={() => !isEditing && onSelect(record.chartId)}
              >
                <div className="library-card-main">
                  {isEditing ? (
                    <form className="rename-form" onSubmit={confirmRename}>
                      <input
                        className="rename-input"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="输入命盘名称…"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                      <button type="submit" className="rename-ok">确定</button>
                      <button type="button" className="rename-cancel" onClick={cancelRename}>取消</button>
                    </form>
                  ) : (
                    <>
                      <div className="library-card-name-row">
                        {record.nickname && (
                          <span className="library-card-nickname">{record.nickname}</span>
                        )}
                        <span className="library-card-label">{record.label}</span>
                        <button
                          className="library-rename-btn"
                          onClick={e => startRename(record.chartId, record.nickname ?? '', e)}
                          title="命名"
                        >✎</button>
                      </div>
                      <div className="library-card-meta">
                        <span>{record.solarDate}</span>
                        <span className="dot">·</span>
                        <span>保存于 {new Date(record.savedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </>
                  )}
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
