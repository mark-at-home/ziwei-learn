import type { IFunctionalPalace } from 'iztro/lib/astro/FunctionalPalace';
import { MUTAGEN_COLOR } from './Palace';
import './ChartBoard.css';

const BRIGHTNESS_LABEL: Record<string, string> = {
  '庙': '庙', '旺': '旺', '得': '得地', '利': '利益',
  '平': '平和', '不': '不得地', '陷': '陷',
};

interface PalaceDetailProps {
  palace: IFunctionalPalace;
  trinityNames?: string[];   // 三方四正宫位名
  onClose: () => void;
}

export default function PalaceDetail({ palace, trinityNames, onClose }: PalaceDetailProps) {
  const allMinor = [
    ...(palace.minorStars  ?? []),
    ...(palace.adjectiveStars ?? []),
  ];

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-header">
          <h3 className="detail-title">
            {palace.name}
            <span className="detail-branch">（{palace.heavenlyStem}{palace.earthlyBranch}）</span>
          </h3>
          <button className="detail-close" onClick={onClose}>✕</button>
        </div>

        {/* 三方四正 */}
        {trinityNames && trinityNames.length > 0 && (
          <div className="trinity-row">
            <span className="trinity-label">三方四正：</span>
            {trinityNames.map((n, i) => (
              <span key={i} className="trinity-name">{n}</span>
            ))}
          </div>
        )}

        {/* 主星 */}
        <section className="detail-section">
          <div className="detail-section-title">主星</div>
          {palace.majorStars && palace.majorStars.length > 0 ? (
            palace.majorStars.map((star, i) => (
              <div key={i} className="detail-star-row">
                <span className="detail-star-name">{star.name}</span>
                <span className="detail-brightness">{BRIGHTNESS_LABEL[star.brightness ?? ''] ?? star.brightness}</span>
                {star.mutagen && (
                  <span className="detail-mutagen" style={{ color: MUTAGEN_COLOR[star.mutagen] }}>
                    化{star.mutagen}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="detail-empty">空宫（无主星）</div>
          )}
        </section>

        {/* 辅星（minorStars + adjectiveStars 合并展示） */}
        {allMinor.length > 0 && (
          <section className="detail-section">
            <div className="detail-section-title">辅星 · 杂曜</div>
            <div className="detail-minor-list">
              {allMinor.map((s: { name: string; type?: string }, i: number) => (
                <span
                  key={i}
                  className={`minor-star-tag ${s.type === 'adjective' || s.type === 'helper' ? 'adjective' : ''}`}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 十二长生（四组） */}
        <section className="detail-section">
          <div className="detail-section-title">十二神</div>
          <div className="changsheng-grid">
            <div className="changsheng-item">
              <span className="changsheng-label">长生十二</span>
              <span className="changsheng-value">{palace.changsheng12 ?? '—'}</span>
            </div>
            <div className="changsheng-item">
              <span className="changsheng-label">博士十二</span>
              <span className="changsheng-value">{palace.boshi12 ?? '—'}</span>
            </div>
            <div className="changsheng-item">
              <span className="changsheng-label">将前十二</span>
              <span className="changsheng-value">{palace.jiangqian12 ?? '—'}</span>
            </div>
            <div className="changsheng-item">
              <span className="changsheng-label">岁前十二</span>
              <span className="changsheng-value">{palace.suiqian12 ?? '—'}</span>
            </div>
          </div>
        </section>

        {/* 大限 */}
        {palace.decadal?.range && (
          <section className="detail-section">
            <div className="detail-section-title">大限年龄</div>
            <div className="detail-value">
              {palace.decadal.range[0]} – {palace.decadal.range[1]} 岁
              （{palace.decadal.heavenlyStem}{palace.decadal.earthlyBranch}）
            </div>
          </section>
        )}
      </div>
    </>
  );
}
