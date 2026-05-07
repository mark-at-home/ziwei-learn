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

type LifeField = { key: keyof LifeInfo; label: string; palace: string; placeholder: string };

// 客观事实 — 反推时辰最重要的依据，请尽量带年龄/年份
const LIFE_FIELDS_OBJECTIVE: LifeField[] = [
  { key: 'parents',  label: '父母情况',     palace: '父母宫', placeholder: '如：父亲健在，母亲在我15岁时因病去世；父亲教师、母亲医生' },
  { key: 'siblings', label: '兄弟姐妹',     palace: '兄弟宫', placeholder: '如：我排行老二，有大哥（长我3岁），无姐妹' },
  { key: 'marriage', label: '婚姻关键事件', palace: '夫妻宫', placeholder: '如：28岁结婚，配偶比我大2岁、从事金融；32岁曾分居半年' },
  { key: 'children', label: '子女关键事件', palace: '子女宫', placeholder: '如：30岁生女，无其他子女；曾于28岁流产' },
  { key: 'career',   label: '事业关键事件', palace: '官禄宫', placeholder: '如：23岁入职互联网，30岁升管理岗，35岁创业，37岁公司停业' },
  { key: 'wealth',   label: '财富关键事件', palace: '财帛宫', placeholder: '如：26岁还清助学贷款，32岁购房首付，34岁股市大亏' },
  { key: 'property', label: '居住与家境',   palace: '田宅宫', placeholder: '如：童年家境一般，父母在国企；25岁后离家独居；32岁在北京购房' },
  { key: 'health',   label: '重大疾病/意外', palace: '疾厄宫', placeholder: '如：12岁车祸骨折；27岁胃溃疡手术；偏头痛常发' },
];

// 主观补充 — 选填，作为辅助参考
const LIFE_FIELDS_SUBJECTIVE: LifeField[] = [
  { key: 'personality', label: '性格特点',  palace: '命宫',   placeholder: '选填：他人/自己对你性格的概括' },
  { key: 'values',      label: '人生追求',  palace: '福德宫', placeholder: '选填：你最看重什么、最在意什么' },
  { key: 'other',       label: '其他重要',  palace: '—',     placeholder: '选填：其他想补充的信息' },
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

        {/* ── 客观事实（重点） ── */}
        <div className="ti-section">
          <h3 className="ti-section-title">客观事实（推断主要依据）</h3>
          <p className="ti-section-hint">
            请尽量包含<strong>年龄/年份</strong>等具体信息，越客观、越带时间点越能反推时辰。例如"30岁结婚"、"父亲在我15岁时去世"、"32岁购房"。至少填写 2 项。
          </p>

          <table className="ti-life-table">
            <tbody>
              {LIFE_FIELDS_OBJECTIVE.map(f => (
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

        {/* ── 主观补充（选填） ── */}
        <div className="ti-section">
          <h3 className="ti-section-title ti-section-title--sub">主观补充（选填，辅助参考）</h3>
          <p className="ti-section-hint">主观感受可能不太可靠，留作后续追问的备选材料即可。</p>

          <table className="ti-life-table">
            <tbody>
              {LIFE_FIELDS_SUBJECTIVE.map(f => (
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
