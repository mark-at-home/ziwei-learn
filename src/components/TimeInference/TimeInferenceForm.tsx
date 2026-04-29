import { useState } from 'react';
import type { Gender } from '../../lib/iztro-wrapper';
import type { LifeInfo } from '../../types/time-inference';
import { lunarToSolar } from '../../lib/lunar-convert';
import './TimeInferenceForm.css';

export type CalendarType = 'solar' | 'lunar';

export interface TimeInferenceFormState {
  calendarType: CalendarType;
  year:   string;
  month:  string;
  day:    string;
  isLeap: boolean;
  gender: Gender | '';
  lifeInfo: LifeInfo;
}

export const emptyTimeInferenceFormState = (): TimeInferenceFormState => ({
  calendarType: 'solar',
  year: '', month: '', day: '', isLeap: false,
  gender: '', lifeInfo: {},
});

interface TimeInferenceFormProps {
  value: TimeInferenceFormState;
  onChange: (state: TimeInferenceFormState) => void;
  onSubmit: (solarDate: string, gender: Gender, lifeInfo: LifeInfo) => void;
  onBack: () => void;
}

const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

const LIFE_FIELDS: { key: keyof LifeInfo; label: string; palace: string; placeholder: string }[] = [
  { key: 'personality', label: '性格特点',  palace: '命宫',     placeholder: '如：内向思考、爱钻研，做事谨慎' },
  { key: 'values',      label: '人生追求',  palace: '福德宫',   placeholder: '如：追求精神满足，重视家庭和睦' },
  { key: 'parents',     label: '父母关系',  palace: '父母宫',   placeholder: '如：母亲性格强势，父母感情和睦' },
  { key: 'siblings',    label: '兄弟姐妹',  palace: '兄弟宫',   placeholder: '如：有一兄一妹，关系一般' },
  { key: 'marriage',    label: '婚姻感情',  palace: '夫妻宫',   placeholder: '如：30岁结婚，配偶事业心强' },
  { key: 'children',    label: '子女情况',  palace: '子女宫',   placeholder: '如：有一女，性格活泼' },
  { key: 'career',      label: '事业经历',  palace: '官禄宫',   placeholder: '如：从事金融行业，35岁创业' },
  { key: 'wealth',      label: '财富状况',  palace: '财帛宫',   placeholder: '如：收入稳定但不算高，少有横财' },
  { key: 'property',    label: '家境田宅',  palace: '田宅宫',   placeholder: '如：35岁买房，家境一般' },
  { key: 'health',      label: '健康疾病',  palace: '疾厄宫',   placeholder: '如：常年胃病，曾有意外受伤' },
  { key: 'other',       label: '其他重要',  palace: '—',        placeholder: '其他想补充的信息' },
];

export default function TimeInferenceForm({ value, onChange, onSubmit, onBack }: TimeInferenceFormProps) {
  const { calendarType, year, month, day, isLeap, gender, lifeInfo } = value;
  const [error, setError] = useState('');

  function patch(p: Partial<TimeInferenceFormState>) {
    onChange({ ...value, ...p });
  }
  const setCalendarType = (v: CalendarType) => patch({ calendarType: v });
  const setYear   = (v: string) => patch({ year: v });
  const setMonth  = (v: string) => patch({ month: v });
  const setDay    = (v: string) => patch({ day: v });
  const setIsLeap = (v: boolean) => patch({ isLeap: v });
  const setGender = (v: Gender) => patch({ gender: v });

  function setLife<K extends keyof LifeInfo>(key: K, val: string) {
    patch({ lifeInfo: { ...lifeInfo, [key]: val } });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!gender) { setError('请选择性别'); return; }
    const y = parseInt(year), m = parseInt(month), d = parseInt(day);
    if (!y || !m || !d) { setError('请填写完整的年月日'); return; }

    let solarDate: string;
    if (calendarType === 'solar') {
      solarDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    } else {
      const r = lunarToSolar({ year: y, month: m, day: d, isLeap });
      if (!r) { setError('农历日期无效，请检查'); return; }
      solarDate = r;
    }

    // 检查至少填写了一项人生信息
    const filledCount = Object.values(lifeInfo).filter(v => v && v.trim().length > 0).length;
    if (filledCount < 2) {
      setError('请至少填写 2 项关键信息以便推断');
      return;
    }

    onSubmit(solarDate, gender as Gender, lifeInfo);
  }

  return (
    <div className="ti-form-wrapper">
      <h1 className="app-title">时辰推断</h1>
      <p className="app-subtitle">不知道出生时辰？输入生日 + 关键信息，让 AI 帮你推断</p>

      <form className="ti-form" onSubmit={handleSubmit}>
        {/* ── 基础信息 ── */}
        <div className="ti-section">
          <h3 className="ti-section-title">基础信息</h3>

          <div className="form-row">
            <label className="form-label">历法</label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${calendarType === 'solar' ? 'active' : ''}`}
                onClick={() => setCalendarType('solar')}>公历</button>
              <button type="button" className={`toggle-btn ${calendarType === 'lunar' ? 'active' : ''}`}
                onClick={() => setCalendarType('lunar')}>农历</button>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">年月日</label>
            <div className="date-inputs">
              <input className="date-input" type="number" placeholder="年" min={1900} max={2100}
                value={year} onChange={e => setYear(e.target.value)} />
              {calendarType === 'lunar' ? (
                <>
                  <select className="select-input" value={month} onChange={e => setMonth(e.target.value)}>
                    <option value="">月</option>
                    {LUNAR_MONTHS.map((n, i) => <option key={i} value={String(i + 1)}>{n}</option>)}
                  </select>
                  <select className="select-input" value={day} onChange={e => setDay(e.target.value)}>
                    <option value="">日</option>
                    {LUNAR_DAYS.map((n, i) => <option key={i} value={String(i + 1)}>{n}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <input className="date-input" type="number" placeholder="月" min={1} max={12}
                    value={month} onChange={e => setMonth(e.target.value)} />
                  <input className="date-input" type="number" placeholder="日" min={1} max={31}
                    value={day} onChange={e => setDay(e.target.value)} />
                </>
              )}
            </div>
          </div>

          {calendarType === 'lunar' && (
            <div className="form-row">
              <label className="form-label">闰月</label>
              <label className="checkbox-label">
                <input type="checkbox" checked={isLeap} onChange={e => setIsLeap(e.target.checked)} />
                <span>本月为闰月</span>
              </label>
            </div>
          )}

          <div className="form-row">
            <label className="form-label">性别 <span className="required">*</span></label>
            <div className="toggle-group">
              <button type="button" className={`toggle-btn ${gender === 'male' ? 'active' : ''}`}
                onClick={() => setGender('male')}>男</button>
              <button type="button" className={`toggle-btn ${gender === 'female' ? 'active' : ''}`}
                onClick={() => setGender('female')}>女</button>
            </div>
          </div>
        </div>

        {/* ── 人生关键信息 ── */}
        <div className="ti-section">
          <h3 className="ti-section-title">人生关键信息</h3>
          <p className="ti-section-hint">填得越具体推断越准。至少填写 2 项。每行末尾标注的宫位是该信息主要对应的紫微宫位。</p>

          <table className="ti-life-table">
            <tbody>
              {LIFE_FIELDS.map(f => (
                <tr key={f.key}>
                  <td className="ti-life-label">
                    <div>{f.label}</div>
                    <div className="ti-life-palace">{f.palace}</div>
                  </td>
                  <td className="ti-life-input-cell">
                    <textarea
                      className="ti-life-input"
                      rows={2}
                      placeholder={f.placeholder}
                      value={lifeInfo[f.key] ?? ''}
                      onChange={e => setLife(f.key, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onBack}>返回</button>
          <button type="submit" className="btn-primary">开始推断</button>
        </div>
      </form>
    </div>
  );
}
