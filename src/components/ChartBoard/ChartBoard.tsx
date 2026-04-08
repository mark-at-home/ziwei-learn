import { useState, useMemo } from 'react';
import type { Astrolabe } from '../../lib/iztro-wrapper';
import type { BaZiChart } from '../../types/bazi';
import Palace from './Palace';
import PalaceDetail from './PalaceDetail';
import BaZiBoard from '../BaZi/BaZiBoard';
import './ChartBoard.css';

// 地支 index → [row, col] in 4×4 grid (寅=0…丑=11)
const GRID_POS: [number, number][] = [
  [3, 0], [2, 0], [1, 0], [0, 0],
  [0, 1], [0, 2], [0, 3], [1, 3],
  [2, 3], [3, 3], [3, 2], [3, 1],
];

export type ViewMode = 'natal' | 'decadal' | 'yearly';

// 计算三方四正索引（target, opposite, wealth=+4, career=+8）
function getTrinitySet(targetIndex: number): Set<number> {
  return new Set([
    targetIndex,
    (targetIndex + 6) % 12,
    (targetIndex + 4) % 12,
    (targetIndex + 8) % 12,
  ]);
}

type YearlyStar = { name: string; mutagen?: string };

function getHoroscope(chart: Astrolabe, currentYear: number) {
  try {
    return chart.horoscope(`${currentYear}-06-01`, 0);
  } catch {
    return null;
  }
}

// 十干四化表：[禄星, 权星, 科星, 忌星]
const STEM_MUTAGEN: Record<string, readonly [string, string, string, string]> = {
  '甲': ['廉贞', '破军', '武曲', '太阳'],
  '乙': ['天机', '天梁', '紫微', '太阴'],
  '丙': ['天同', '天机', '文昌', '廉贞'],
  '丁': ['太阴', '天同', '天机', '巨门'],
  '戊': ['贪狼', '太阴', '右弼', '天机'],
  '己': ['武曲', '贪狼', '天梁', '文曲'],
  '庚': ['太阳', '武曲', '太阴', '天同'],
  '辛': ['巨门', '太阳', '文曲', '文昌'],
  '壬': ['天梁', '紫微', '左辅', '武曲'],
  '癸': ['破军', '巨门', '太阴', '贪狼'],
};
const MUTAGEN_KEYS = ['禄', '权', '科', '忌'] as const;

/** 根据选中宫位的天干，计算飞化落宫：palaceIndex → 化X */
function computeFlyingMutagen(chart: Astrolabe, selectedIndex: number): Map<number, string> {
  const map = new Map<number, string>();
  const stem = chart.palaces[selectedIndex]?.heavenlyStem as string;
  const stars = STEM_MUTAGEN[stem];
  if (!stars) return map;

  stars.forEach((starName, i) => {
    for (const palace of chart.palaces) {
      const allStars = [
        ...(palace.majorStars   ?? []),
        ...(palace.minorStars   ?? []),
        ...(palace.adjectiveStars ?? []),
      ];
      if (allStars.some(s => (s as { name: string }).name === starName)) {
        map.set(palace.index, MUTAGEN_KEYS[i]);
        break;
      }
    }
  });
  return map;
}

interface ChartBoardProps {
  chart: Astrolabe;
  baziChart?: BaZiChart;
  // 嵌入模式（用于分析/答题页侧边栏）
  embedded?: boolean;
  onBack?: () => void;
  onProceed?: () => void;
}

export default function ChartBoard({ chart, baziChart, embedded = false, onBack, onProceed }: ChartBoardProps) {
  const currentYear = new Date().getFullYear();

  const [boardTab, setBoardTab]             = useState<'ziwei' | 'bazi'>('ziwei');
  const [viewMode, setViewMode]             = useState<ViewMode>('natal');
  const [selectedIndex, setSelectedIndex]   = useState<number | null>(null);

  const horoscope     = useMemo(() => getHoroscope(chart, currentYear), [chart, currentYear]);
  const decadalIndex  = horoscope?.decadal?.index ?? -1;
  const yearlyIndex   = horoscope?.yearly?.index  ?? -1;
  // yearly.stars 是 FunctionalStar[][] 按宫位 index 排列
  const yearlyStarsMap = (horoscope?.yearly?.stars ?? []) as YearlyStar[][];

  const trinitySet = useMemo(
    () => selectedIndex !== null ? getTrinitySet(selectedIndex) : new Set<number>(),
    [selectedIndex],
  );

  const flyingMutagenMap = useMemo(
    () => selectedIndex !== null ? computeFlyingMutagen(chart, selectedIndex) : new Map<number, string>(),
    [selectedIndex, chart],
  );

  const selectedPalace = selectedIndex !== null ? chart.palaces[selectedIndex] : null;

  // 三方四正宫位名（用于 PalaceDetail 展示）
  const trinityNames = selectedIndex !== null
    ? [...getTrinitySet(selectedIndex)]
        .filter(i => i !== selectedIndex)
        .map(i => chart.palaces[i]?.name ?? '')
        .filter(Boolean)
    : [];

  // chart.gender 是 iztro 本地化后的中文值 '男'/'女'，也可能是英文 key 'male'/'female'
  const genderLabel = (chart.gender === 'male' || chart.gender === '男') ? '男命' : '女命';

  const gridClass = embedded ? 'chartboard-grid chartboard-grid--embedded' : 'chartboard-grid';

  return (
    <div className={embedded ? 'chartboard-embedded' : 'chartboard-page'}>
      {/* 顶部信息栏 */}
      <div className="chartboard-header">
        {!embedded && onBack && (
          <button className="back-btn" onClick={onBack}>← 重新输入</button>
        )}
        <div className="chart-meta">
          <span className="chart-date">{chart.solarDate}</span>
          <span className="chart-dot">·</span>
          <span>{chart.time}</span>
          <span className="chart-dot">·</span>
          <span>{genderLabel}</span>
        </div>
        <div className="view-toggle">
          {(['natal', 'decadal', 'yearly'] as ViewMode[]).map(m => (
            <button
              key={m}
              className={`toggle-btn ${viewMode === m ? 'active' : ''}`}
              onClick={() => setViewMode(m)}
            >
              {{ natal: '本命', decadal: '大运', yearly: '流年' }[m]}
            </button>
          ))}
        </div>
      </div>

      {/* 系统 tab（仅有八字时显示） */}
      {baziChart && (
        <div className="board-tab-row">
          <button
            className={`board-tab-btn${boardTab === 'ziwei' ? ' board-tab-btn--active' : ''}`}
            onClick={() => setBoardTab('ziwei')}
          >紫微斗数</button>
          <button
            className={`board-tab-btn${boardTab === 'bazi' ? ' board-tab-btn--active' : ''}`}
            onClick={() => setBoardTab('bazi')}
          >八字</button>
        </div>
      )}

      {/* 八字视图 */}
      {baziChart && boardTab === 'bazi' && <BaZiBoard chart={baziChart} />}

      {/* 以下紫微内容仅在 ziwei tab 时显示 */}
      {boardTab === 'ziwei' && (viewMode === 'decadal' || viewMode === 'yearly') && (
        <div className="horoscope-bar">
          {viewMode === 'decadal' && decadalIndex >= 0 && (
            <span className="horoscope-tag horoscope-tag--decadal">
              当前大运：{chart.palaces[decadalIndex]?.name}（
              {chart.palaces[decadalIndex]?.decadal?.range?.join('–')}岁）
            </span>
          )}
          {viewMode === 'yearly' && yearlyIndex >= 0 && (
            <span className="horoscope-tag horoscope-tag--yearly">
              {currentYear}流年：{chart.palaces[yearlyIndex]?.name}
            </span>
          )}
        </div>
      )}

      {/* 命盘格（仅紫微 tab） */}
      {boardTab === 'ziwei' && <div className={gridClass}>
        {chart.palaces.map((palace: import('iztro/lib/astro/FunctionalPalace').IFunctionalPalace) => {
          const [row, col] = GRID_POS[palace.index];
          return (
            <Palace
              key={palace.index}
              palace={palace}
              viewMode={viewMode}
              isSelected={selectedIndex === palace.index}
              isTrinity={selectedIndex !== null && selectedIndex !== palace.index && trinitySet.has(palace.index)}
              isDecadalActive={palace.index === decadalIndex}
              isYearlyActive={palace.index === yearlyIndex}
              yearlyStars={yearlyStarsMap[palace.index] ?? []}
              flyingMutagen={flyingMutagenMap.get(palace.index)}
              style={{ gridRow: row + 1, gridColumn: col + 1 }}
              onClick={() => setSelectedIndex(selectedIndex === palace.index ? null : palace.index)}
            />
          );
        })}

        {/* 中宫 */}
        <div className="center-info">
          <div className="center-label">命主</div>
          <div className="center-value">{chart.soul}</div>
          <div className="center-label">身主</div>
          <div className="center-value">{chart.body}</div>
          <div className="center-label">五行局</div>
          <div className="center-value">{chart.fiveElementsClass}</div>
          <div className="center-label">四柱</div>
          <div className="center-value" style={{ fontSize: '0.7rem', letterSpacing: '0.03em' }}>{chart.chineseDate}</div>
          {!embedded && (
            <>
              <div className="center-label">农历</div>
              <div className="center-value lunar">{chart.lunarDate}</div>
            </>
          )}
        </div>
      </div>

      {/* 宫位详情（非嵌入模式用弹层，嵌入模式用内嵌展示） */}
      {boardTab === 'ziwei' && selectedPalace && !embedded && (
        <PalaceDetail
          palace={selectedPalace}
          trinityNames={trinityNames}
          onClose={() => setSelectedIndex(null)}
        />
      )}

      {/* 嵌入模式：宫位详情内嵌在下方 */}
      {boardTab === 'ziwei' && selectedPalace && embedded && (
        <div className="embedded-detail">
          <div className="embedded-detail-title">
            {selectedPalace.name}（{selectedPalace.heavenlyStem}{selectedPalace.earthlyBranch}）
          </div>
          {trinityNames.length > 0 && (
            <div className="embedded-trinity">
              三方四正：{trinityNames.join(' · ')}
            </div>
          )}
          <div className="embedded-stars">
            {selectedPalace.majorStars?.map((s, i) => (
              <span key={i} className="embedded-major">{s.name}</span>
            ))}
            {([...(selectedPalace.minorStars ?? []), ...(selectedPalace.adjectiveStars ?? [])] as { name: string }[]).slice(0, 6).map((s, i) => (
              <span key={i} className="embedded-minor">{s.name}</span>
            ))}
          </div>
          <div className="embedded-changsheng">
            {selectedPalace.changsheng12 && <span>长生：{selectedPalace.changsheng12}</span>}
            {selectedPalace.boshi12     && <span>博士：{selectedPalace.boshi12}</span>}
          </div>
        </div>
      )}

      {/* 底部按钮（仅独立模式） */}
      {!embedded && (
        <div className="chartboard-footer">
          {onBack     && <button className="btn-secondary" onClick={onBack}>重新排盘</button>}
          {onProceed  && <button className="btn-primary"   onClick={onProceed}>开始学习 →</button>}
        </div>
      )}
    </div>
  );
}
