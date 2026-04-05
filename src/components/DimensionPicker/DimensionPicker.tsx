import { useState } from 'react';
import { DIMENSIONS, DIMENSION_GROUPS } from '../../types';
import type { Dimension } from '../../types';
import './DimensionPicker.css';

interface DimensionPickerProps {
  onConfirm: (selected: Dimension[]) => void;
  onViewOnly: () => void;
  onBack: () => void;
}

export default function DimensionPicker({ onConfirm, onViewOnly, onBack }: DimensionPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectLevel(level: number) {
    setSelected(prev => {
      const next = new Set(prev);
      const levelDims = DIMENSIONS.filter(d => d.level === level);
      const allSelected = levelDims.every(d => next.has(d.key));
      levelDims.forEach(d => allSelected ? next.delete(d.key) : next.add(d.key));
      return next;
    });
  }

  function handleConfirm() {
    const dims = DIMENSIONS.filter(d => selected.has(d.key));
    if (dims.length === 0) return;
    onConfirm(dims);
  }

  return (
    <div className="picker-page">
      <div className="picker-header">
        <button className="back-btn" onClick={onBack}>← 返回命盘</button>
        <h2 className="picker-title">选择学习维度</h2>
      </div>

      <div className="picker-content">
        {DIMENSION_GROUPS.map(group => {
          const dims = DIMENSIONS.filter(d => d.level === group.level);
          const selectedCount = dims.filter(d => selected.has(d.key)).length;
          return (
            <div key={group.level} className="picker-group">
              <div className="group-header">
                <div className="group-label">
                  <span className="group-level">L{group.level}</span>
                  {group.label}
                  <span className="group-desc">{group.description}</span>
                </div>
                <button
                  className="group-select-all"
                  onClick={() => selectLevel(group.level)}
                >
                  {selectedCount === dims.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="dim-grid">
                {dims.map(d => (
                  <button
                    key={d.key}
                    className={`dim-btn ${selected.has(d.key) ? 'dim-btn--selected' : ''}`}
                    onClick={() => toggle(d.key)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="picker-footer">
        <button className="btn-text" onClick={onViewOnly}>仅查看分析</button>
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={selected.size === 0}
        >
          开始学习（{selected.size}个维度）
        </button>
      </div>
    </div>
  );
}
