import { useState } from 'react';
import { generateChart, generateRandomChart, validateChart, TIME_NAMES } from '../../lib/iztro-wrapper';
import type { Astrolabe, Gender } from '../../lib/iztro-wrapper';
import { lunarToSolar } from '../../lib/lunar-convert';
import './InputForm.css';

interface InputFormProps {
  onSubmit: (chart: Astrolabe) => void;
}

type CalendarType = 'solar' | 'lunar';

const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

interface FormState {
  calendarType: CalendarType;
  year: string;
  month: string;
  day: string;
  isLeap: boolean;
  timeIndex: number;
  gender: Gender | '';
}

function todayState(): FormState {
  const now = new Date();
  return {
    calendarType: 'solar',
    year:  String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    day:   String(now.getDate()),
    isLeap: false,
    timeIndex: 0,
    gender: '',
  };
}

export default function InputForm({ onSubmit }: InputFormProps) {
  const [form, setForm]   = useState<FormState>(todayState);
  const [error, setError] = useState<string>('');

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.gender) {
      setError('请选择性别');
      return;
    }
    const y = parseInt(form.year);
    const m = parseInt(form.month);
    const d = parseInt(form.day);
    if (!y || !m || !d) {
      setError('请填写完整的年月日');
      return;
    }

    let solarDate: string;

    if (form.calendarType === 'solar') {
      solarDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    } else {
      const result = lunarToSolar({ year: y, month: m, day: d, isLeap: form.isLeap });
      if (!result) {
        setError('农历日期无效，请检查输入');
        return;
      }
      solarDate = result;
    }

    try {
      const chart = generateChart(solarDate, form.timeIndex, form.gender as Gender);
      if (!validateChart(chart)) {
        setError('命盘数据异常，请检查日期是否正确');
        return;
      }
      onSubmit(chart);
    } catch {
      setError('排盘失败，请检查日期范围（建议 1900–2100 年）');
    }
  }

  function handleRandom() {
    setError('');
    const chart = generateRandomChart();
    onSubmit(chart);
  }

  return (
    <div className="input-form-wrapper">
      <h1 className="app-title">紫微研习</h1>
      <p className="app-subtitle">输入生辰八字，排盘研习</p>

      <form className="input-form" onSubmit={handleSubmit}>
        {/* 历法切换 */}
        <div className="form-row">
          <label className="form-label">历法</label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${form.calendarType === 'solar' ? 'active' : ''}`}
              onClick={() => set('calendarType', 'solar')}
            >公历</button>
            <button
              type="button"
              className={`toggle-btn ${form.calendarType === 'lunar' ? 'active' : ''}`}
              onClick={() => set('calendarType', 'lunar')}
            >农历</button>
          </div>
        </div>

        {/* 年月日 */}
        <div className="form-row">
          <label className="form-label">年月日</label>
          <div className="date-inputs">
            <input
              className="date-input"
              type="number"
              placeholder="年"
              min={1900}
              max={2100}
              value={form.year}
              onChange={e => set('year', e.target.value)}
            />
            {form.calendarType === 'lunar' ? (
              <>
                <select
                  className="select-input"
                  value={form.month}
                  onChange={e => set('month', e.target.value)}
                >
                  <option value="">月</option>
                  {LUNAR_MONTHS.map((name, i) => (
                    <option key={i} value={String(i + 1)}>{name}</option>
                  ))}
                </select>
                <select
                  className="select-input"
                  value={form.day}
                  onChange={e => set('day', e.target.value)}
                >
                  <option value="">日</option>
                  {LUNAR_DAYS.map((name, i) => (
                    <option key={i} value={String(i + 1)}>{name}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <input
                  className="date-input"
                  type="number"
                  placeholder="月"
                  min={1}
                  max={12}
                  value={form.month}
                  onChange={e => set('month', e.target.value)}
                />
                <input
                  className="date-input"
                  type="number"
                  placeholder="日"
                  min={1}
                  max={31}
                  value={form.day}
                  onChange={e => set('day', e.target.value)}
                />
              </>
            )}
          </div>
        </div>

        {/* 农历闰月 */}
        {form.calendarType === 'lunar' && (
          <div className="form-row">
            <label className="form-label">闰月</label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={form.isLeap}
                onChange={e => set('isLeap', e.target.checked)}
              />
              <span>本月为闰月</span>
            </label>
          </div>
        )}

        {/* 时辰 */}
        <div className="form-row">
          <label className="form-label">时辰</label>
          <select
            className="select-input"
            value={form.timeIndex}
            onChange={e => set('timeIndex', parseInt(e.target.value))}
          >
            {TIME_NAMES.map((name, i) => {
              const ranges = ['23:00-01:00', '01:00-03:00', '03:00-05:00', '05:00-07:00', '07:00-09:00', '09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00', '17:00-19:00', '19:00-21:00', '21:00-23:00', '00:00-01:00'];
              return <option key={i} value={i}>{name}时（{ranges[i]}）</option>;
            })}
          </select>
        </div>

        {/* 性别 */}
        <div className="form-row">
          <label className="form-label">性别 <span className="required">*</span></label>
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${form.gender === 'male' ? 'active' : ''}`}
              onClick={() => set('gender', 'male')}
            >男</button>
            <button
              type="button"
              className={`toggle-btn ${form.gender === 'female' ? 'active' : ''}`}
              onClick={() => set('gender', 'female')}
            >女</button>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn-primary">排盘</button>
          <button type="button" className="btn-secondary" onClick={handleRandom}>随机生成</button>
        </div>
      </form>
    </div>
  );
}
