import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace';
import './ChartBoard.css';

export const MUTAGEN_COLOR: Record<string, string> = {
  '禄': '#4a8c5c',
  '权': '#c9a84c',
  '科': '#4a6e8c',
  '忌': '#8b1a1a',
};

// 庙旺衰陷颜色
const BRIGHTNESS_COLOR: Record<string, string> = {
  '庙': '#c9a84c',
  '旺': '#8ab870',
  '得': '#6a9a80',
  '利': '#8a9a7a',
  '平': '#5a5a5a',
  '不': '#7a5a4a',
  '陷': '#8b3a2a',
};

interface PalaceProps {
  palace: IFunctionalPalace;
  viewMode: 'natal' | 'decadal' | 'yearly';
  isSelected: boolean;
  isTrinity: boolean;
  isDecadalActive: boolean;
  isYearlyActive: boolean;
  yearlyStars: { name: string; mutagen?: string }[];
  flyingMutagen?: string;   // 本宫天干飞化落此宫的化X
  style: React.CSSProperties;
  onClick: () => void;
}

export default function Palace({
  palace, viewMode, isSelected, isTrinity,
  isDecadalActive, isYearlyActive, yearlyStars, flyingMutagen, style, onClick,
}: PalaceProps) {
  const isLife = palace.isOriginalPalace;
  const isBody = palace.isBodyPalace;

  const extraClass = [
    isLife          ? 'palace--life'    : '',
    isSelected      ? 'palace--selected': '',
    isTrinity       ? 'palace--trinity' : '',
    isDecadalActive ? 'palace--decadal' : '',
    isYearlyActive  ? 'palace--yearly'  : '',
  ].filter(Boolean).join(' ');

  const allMinor = [
    ...(palace.minorStars ?? []),
    ...(palace.adjectiveStars ?? []),
  ];

  // 本宫四化（从主星 mutagen 字段提取）
  const mutagenList = (palace.majorStars ?? [])
    .filter(s => s.mutagen)
    .map(s => ({ name: s.name, mutagen: s.mutagen! }));

  // 小限年份（取前8个避免溢出）
  const ages = palace.ages ?? [];

  return (
    <div className={`palace ${extraClass}`} style={style} onClick={onClick}>
      {/* 飞化标记（绝对定位，右上角） */}
      {flyingMutagen && (
        <span className="palace-flying-mutagen" style={{ color: MUTAGEN_COLOR[flyingMutagen] }}>
          化{flyingMutagen}
        </span>
      )}

      {/* 宫位名称 & 干支 */}
      <div className="palace-title">
        <span className="palace-name">{palace.name}</span>
        {isLife && <span className="palace-tag tag--life">命</span>}
        {isBody && <span className="palace-tag tag--body">身</span>}
      </div>
      <div className="palace-branch">{palace.heavenlyStem}{palace.earthlyBranch}</div>

      {/* 主星（带庙旺衰陷） */}
      <div className="palace-stars">
        {palace.majorStars?.map((star, i) => (
          <div key={i} className="major-star-row">
            <span className="major-star">{star.name}</span>
            {star.brightness && (
              <span
                className="brightness-badge"
                style={{ color: BRIGHTNESS_COLOR[star.brightness] ?? '#5a5a5a' }}
              >
                {star.brightness}
              </span>
            )}
            {star.mutagen && (
              <span className="mutagen-badge" style={{ color: MUTAGEN_COLOR[star.mutagen] }}>
                化{star.mutagen}
              </span>
            )}
          </div>
        ))}
        {(!palace.majorStars || palace.majorStars.length === 0) && (
          <span className="empty-palace">空宫</span>
        )}
      </div>

      {/* 副星 */}
      {allMinor.length > 0 && (
        <div className="palace-minor-stars">
          {allMinor.map((s: { name: string }, i: number) => (
            <span key={i} className="minor-star">{s.name}</span>
          ))}
        </div>
      )}

      {/* 流年星曜 */}
      {yearlyStars.length > 0 && (
        <div className="palace-yearly-stars">
          {yearlyStars.map((s, i) => (
            <span key={i} className="yearly-star">
              {s.name}
              {s.mutagen && (
                <span style={{ color: MUTAGEN_COLOR[s.mutagen] }}>化{s.mutagen}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 本宫四化（选中时在底部显示） */}
      {isSelected && mutagenList.length > 0 && (
        <div className="palace-mutagen-bar">
          {mutagenList.map((m, i) => (
            <span key={i} className="palace-mutagen-item" style={{ color: MUTAGEN_COLOR[m.mutagen] }}>
              {m.name}化{m.mutagen}
            </span>
          ))}
        </div>
      )}

      {/* 小限年份 */}
      {ages.length > 0 && (
        <div className="palace-ages">
          {ages.slice(0, 7).join('·')}
        </div>
      )}

      {/* 长生十二神（本命模式，未选中时） */}
      {viewMode === 'natal' && !isSelected && palace.changsheng12 && (
        <div className="palace-changsheng">{palace.changsheng12}</div>
      )}

      {/* 大限（始终显示年龄段，当前大运高亮） */}
      {palace.decadal?.range && (
        <div className={`palace-decadal ${isDecadalActive ? 'palace-decadal--active' : ''}`}>
          {palace.decadal.range[0]}–{palace.decadal.range[1]}
        </div>
      )}

      {/* 流年小限宫标注 */}
      {isYearlyActive && (
        <div className="palace-yearly-label">小限</div>
      )}
    </div>
  );
}
