import { useState } from 'react';
import { DIMENSION_GROUPS, SHARED_DIMENSIONS, ZIWEI_DIMENSIONS, BAZI_SPECIFIC_DIMENSIONS } from '../../types';
import type { Dimension } from '../../types';
import './DimensionPicker.css';

export type SystemSelection = 'ziwei' | 'bazi' | 'both';

interface DimensionPickerProps {
  onConfirm: (selected: Dimension[], systems: SystemSelection) => void;
  onViewOnly: (systems: SystemSelection) => void;
  onBack: () => void;
}

// 按层级分组展示的维度池
const ZIWEI_L1_L3 = ZIWEI_DIMENSIONS;
const BAZI_L1_L3  = BAZI_SPECIFIC_DIMENSIONS;
const SHARED_L4_L5 = SHARED_DIMENSIONS.filter(d => d.level >= 4);

export default function DimensionPicker({ onConfirm, onViewOnly, onBack }: DimensionPickerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // simple: track as pair of booleans
  const [useZiwei, setUseZiwei] = useState(true);
  const [useBazi,  setUseBazi]  = useState(false);

  const effectiveSystems: SystemSelection = useZiwei && useBazi ? 'both' : useBazi ? 'bazi' : 'ziwei';

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function selectGroup(dims: Dimension[]) {
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = dims.every(d => next.has(d.key));
      dims.forEach(d => allSelected ? next.delete(d.key) : next.add(d.key));
      return next;
    });
  }

  function handleConfirm() {
    // collect all relevant dims based on system selection
    const allDims = getAllDims();
    const dims = allDims.filter(d => selected.has(d.key));
    if (dims.length === 0) return;
    onConfirm(dims, effectiveSystems);
  }

  function getAllDims(): Dimension[] {
    const pool: Dimension[] = [];
    if (useZiwei) pool.push(...ZIWEI_L1_L3);
    if (useBazi)  pool.push(...BAZI_L1_L3);
    pool.push(...SHARED_L4_L5);
    return pool;
  }

  function DimGroup({ title, dims, level }: { title: string; dims: Dimension[]; level?: number }) {
    const selectedCount = dims.filter(d => selected.has(d.key)).length;
    return (
      <div className="picker-group">
        <div className="group-header">
          <div className="group-label">
            {level !== undefined && <span className="group-level">L{level}</span>}
            {title}
          </div>
          <button className="group-select-all" onClick={() => selectGroup(dims)}>
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
  }

  // group shared dims by level for display
  const sharedByLevel = DIMENSION_GROUPS.filter(g => g.level >= 4).map(g => ({
    group: g,
    dims: SHARED_L4_L5.filter(d => d.level === g.level),
  })).filter(x => x.dims.length > 0);

  const totalSelected = selected.size;

  return (
    <div className="picker-page">
      <div className="picker-header">
        <button className="back-btn" onClick={onBack}>← 返回命盘</button>
        <h2 className="picker-title">选择学习维度</h2>
      </div>

      {/* 系统选择 */}
      <div className="picker-system-row">
        <span className="picker-system-label">分析系统</span>
        <label className="system-toggle-label">
          <input
            type="checkbox"
            checked={useZiwei}
            onChange={e => {
              if (!e.target.checked && !useBazi) return; // 至少选一个
              setUseZiwei(e.target.checked);
            }}
          />
          <span>紫微斗数</span>
        </label>
        <label className="system-toggle-label">
          <input
            type="checkbox"
            checked={useBazi}
            onChange={e => {
              if (!e.target.checked && !useZiwei) return;
              setUseBazi(e.target.checked);
            }}
          />
          <span>八字</span>
        </label>
        {useZiwei && useBazi && (
          <span className="system-both-hint">两套并行，可生成互证对比</span>
        )}
      </div>

      <div className="picker-content">
        {/* 紫微专项 L1–L3 */}
        {useZiwei && (
          <div className="picker-system-section">
            <div className="picker-system-title">紫微斗数</div>
            {DIMENSION_GROUPS.filter(g => g.level <= 3).map(g => {
              const dims = ZIWEI_L1_L3.filter(d => d.level === g.level);
              if (dims.length === 0) return null;
              return (
                <DimGroup
                  key={`ziwei-${g.level}`}
                  title={`${g.label} · ${g.description}`}
                  dims={dims}
                  level={g.level}
                />
              );
            })}
          </div>
        )}

        {/* 八字专项 L1–L3 */}
        {useBazi && (
          <div className="picker-system-section">
            <div className="picker-system-title">八字</div>
            {DIMENSION_GROUPS.filter(g => g.level <= 3).map(g => {
              const dims = BAZI_L1_L3.filter(d => d.level === g.level);
              if (dims.length === 0) return null;
              return (
                <DimGroup
                  key={`bazi-${g.level}`}
                  title={`${g.label} · ${g.description}`}
                  dims={dims}
                  level={g.level}
                />
              );
            })}
          </div>
        )}

        {/* 共享维度 L4–L5 */}
        <div className="picker-system-section">
          <div className="picker-system-title">共享维度</div>
          {sharedByLevel.map(({ group, dims }) => (
            <DimGroup
              key={`shared-${group.level}`}
              title={`${group.label} · ${group.description}`}
              dims={dims}
              level={group.level}
            />
          ))}
        </div>
      </div>

      <div className="picker-footer">
        <button className="btn-text" onClick={() => onViewOnly(effectiveSystems)}>仅查看分析</button>
        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={totalSelected === 0}
        >
          开始学习（{totalSelected}个维度）
        </button>
      </div>
    </div>
  );
}
