import { useState } from 'react';
import { DIMENSIONS } from '../../types';
import type { Dimension } from '../../types';
import './DimensionPicker.css';

interface DimensionPickerProps {
  onConfirm: (selected: Dimension[]) => void;
  onViewOnly: () => void;  // 只看分析不答题
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

  function handleConfirm() {
    const dims = DIMENSIONS.filter(d => selected.has(d.key));
    if (dims.length === 0) return;
    onConfirm(dims);
  }

  const structural = DIMENSIONS.filter(d => d.category === 'structural');
  const event      = DIMENSIONS.filter(d => d.category === 'event');

  return (
    <div className="picker-page">
      <div className="picker-header">
        <button className="back-btn" onClick={onBack}>← 返回命盘</button>
        <h2 className="picker-title">选择学习维度</h2>
      </div>

      <div className="picker-content">
        <div className="picker-group">
          <div className="group-label">结构性维度</div>
          <div className="dim-grid">
            {structural.map(d => (
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

        <div className="picker-group">
          <div className="group-label">事件性维度</div>
          <div className="dim-grid">
            {event.map(d => (
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
