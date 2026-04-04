import { useState, useCallback, useRef } from 'react';
import type { Astrolabe } from '../../lib/iztro-wrapper';
import ChartBoard from '../ChartBoard/ChartBoard';
import './SplitLayout.css';

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 380;

interface SplitLayoutProps {
  chart: Astrolabe;
  children: React.ReactNode;
}

export default function SplitLayout({ chart, children }: SplitLayoutProps) {
  const [chartVisible, setChartVisible] = useState(true);
  const [chartWidth, setChartWidth]     = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX   = useRef(0);
  const startW   = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = chartWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX.current;
      const next  = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta));
      setChartWidth(next);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [chartWidth]);

  return (
    <div className="split-layout">
      {/* 命盘侧边栏 */}
      <aside
        className={`split-chart ${chartVisible ? '' : 'split-chart--hidden'}`}
        style={chartVisible ? { width: chartWidth } : undefined}
      >
        <ChartBoard chart={chart} embedded />
      </aside>

      {/* 拖动手柄（桌面端） */}
      {chartVisible && (
        <div className="split-resize-handle" onMouseDown={onMouseDown} />
      )}

      {/* 主内容区 */}
      <main className="split-content">
        {/* 移动端：命盘折叠按钮 */}
        <button
          className="chart-toggle-btn"
          onClick={() => setChartVisible(v => !v)}
        >
          {chartVisible ? '隐藏命盘 ▲' : '显示命盘 ▼'}
        </button>
        {children}
      </main>
    </div>
  );
}
