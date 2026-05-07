import { useState } from 'react';
import InputForm from './components/InputForm/InputForm';
import ChartBoard from './components/ChartBoard/ChartBoard';
import DimensionPicker from './components/DimensionPicker/DimensionPicker';
import type { SystemSelection } from './components/DimensionPicker/DimensionPicker';
import AnalysisPanel from './components/Analysis/AnalysisPanel';
import SplitLayout from './components/SplitLayout/SplitLayout';
import ChartLibrary from './components/ChartLibrary/ChartLibrary';
import TimeInferenceForm, { emptyTimeInferenceFormState } from './components/TimeInference/TimeInferenceForm';
import type { TimeInferenceFormState } from './components/TimeInference/TimeInferenceForm';
import TimeInferenceResultPanel from './components/TimeInference/TimeInferenceResult';
import type { Astrolabe } from './lib/iztro-wrapper';
import { generateChart, TIME_NAMES } from './lib/iztro-wrapper';
import type { Gender } from './lib/iztro-wrapper';
import {
  generateAnalysis, getAnalysisPrompt, chatWithChart,
  generateBaZiAnalysis, getBaziAnalysisPrompt, generateCompare,
} from './lib/claude-api';
import type { ChatMessage } from './lib/claude-api';
import type { LLMModel } from './lib/claude-api';
import { saveChartRecord, loadChartRecord } from './lib/storage';
import type { ChartAnalysis, Dimension } from './types';
import type { BaZiChart, BaZiAnalysis } from './types/bazi';
import type { LifeInfo, TimeInferenceResult } from './types/time-inference';
import { generateBaZiChart, timeIndexToHour } from './lib/bazi-wrapper';
import { inferBirthTime } from './lib/time-inference';

type AppView =
  | 'home'
  | 'input'
  | 'chart'
  | 'library'
  | 'dimension-picker'
  | 'loading-analysis'
  | 'analysis'
  | 'time-input'
  | 'time-loading'
  | 'time-result';

export default function App() {
  const [view, setView]                   = useState<AppView>('home');
  const [chart, setChart]                 = useState<Astrolabe | null>(null);
  const [baziChart, setBaziChart]         = useState<BaZiChart | null>(null);
  const [analysis, setAnalysis]           = useState<ChartAnalysis | null>(null);
  const [baziAnalysis, setBaziAnalysis]   = useState<BaZiAnalysis | null>(null);
  const [selectedDimensions, setSelected] = useState<Dimension[]>([]);
  const [loadingMsg, setLoadingMsg]       = useState('');
  const [error, setError]                 = useState('');
  const [model, setModel]                 = useState<LLMModel>('gemini-3-pro');
  const [promptText, setPromptText]             = useState<{ system: string; user: string } | null>(null);
  const [baziPromptText, setBaziPromptText]     = useState<{ system: string; user: string } | null>(null);

  // 时辰推断状态
  const [tiSolarDate, setTiSolarDate] = useState('');
  const [tiGender, setTiGender]       = useState<Gender>('male');
  const [tiLifeInfo, setTiLifeInfo]   = useState<LifeInfo>({});
  const [tiResult, setTiResult]       = useState<TimeInferenceResult | null>(null);
  const [tiForm, setTiForm]           = useState<TimeInferenceFormState>(emptyTimeInferenceFormState());
  const [tiRefineCount, setTiRefineCount] = useState(0);
  const TI_MAX_REFINES = 2;

  // ── 排盘完成 ─────────────────────────────────────────────────
  function handleChartGenerated(c: Astrolabe) {
    setChart(c);
    setAnalysis(null);
    setBaziAnalysis(null);
    setSelected([]);
    setError('');
    saveChartRecord(c);
    try {
      const stored = c as Astrolabe & { time: string; solarDate: string };
      const timeStr = stored.time ?? '';
      const timeIndex = TIME_NAMES.findIndex(t => timeStr.startsWith(t));
      const gender = (c.gender === '女' || c.gender === 'female') ? 'female' : 'male';
      const bazi = generateBaZiChart(stored.solarDate, timeIndexToHour(timeIndex >= 0 ? timeIndex : 0), gender);
      setBaziChart(bazi);
    } catch {
      setBaziChart(null);
    }
    setView('chart');
  }

  // ── 从历史记录恢复命盘 ───────────────────────────────────────
  function handleRestoreChart(chartId: string) {
    const record = loadChartRecord(chartId);
    if (!record) return;
    const stored = record.astrolabe as Astrolabe & { time: string; gender: string };
    const timeStr = stored.time ?? '';
    const timeIndex = TIME_NAMES.findIndex(t => timeStr.startsWith(t));
    const gender = (stored.gender === '女' ? 'female' : 'male') as Gender;
    const freshChart = generateChart(record.solarDate, timeIndex >= 0 ? timeIndex : 0, gender);
    setChart(freshChart);
    setAnalysis(null);
    setBaziAnalysis(null);
    setSelected([]);
    setError('');
    try {
      const bazi = generateBaZiChart(record.solarDate, timeIndexToHour(timeIndex >= 0 ? timeIndex : 0), gender);
      setBaziChart(bazi);
    } catch {
      setBaziChart(null);
    }
    setView('chart');
  }

  function handleProceed() { setView('dimension-picker'); }

  // ── 确认维度，生成分析 ────────────────────────────────────────
  async function handleDimensionsConfirmed(dims: Dimension[], systems: SystemSelection) {
    if (!chart) return;
    setSelected(dims);
    setPromptText(getAnalysisPrompt(chart, dims));
    setView('loading-analysis');

    const needZiwei = systems === 'ziwei' || systems === 'both';
    const needBazi  = (systems === 'bazi'  || systems === 'both') && !!baziChart;

    setLoadingMsg(needZiwei && needBazi ? '正在生成紫微 + 八字分析…' : needBazi ? '正在生成八字分析…' : '正在生成命理分析…');

    if (needBazi && baziChart) setBaziPromptText(getBaziAnalysisPrompt(baziChart, dims));

    try {
      const [ziweiResult, baziResult] = await Promise.all([
        needZiwei ? generateAnalysis(chart, dims, model) : Promise.resolve(null),
        needBazi  ? generateBaZiAnalysis(baziChart!, dims, model) : Promise.resolve(null),
      ]);
      if (ziweiResult) setAnalysis(ziweiResult);
      if (baziResult)  setBaziAnalysis(baziResult);
      if (!needZiwei && !analysis) setAnalysis({ summary: '', palaceAnalysis: [], mutagenAnalysis: '', decadalFortune: '', eventAnalysis: [], keyFeatures: [] });
      setView('analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析生成失败，请确认代理服务已启动');
      setView('dimension-picker');
    }
  }

  async function handleViewOnly(systems: SystemSelection) {
    if (!chart) return;
    setPromptText(getAnalysisPrompt(chart, []));
    setView('loading-analysis');

    const needZiwei = systems === 'ziwei' || systems === 'both';
    const needBazi  = (systems === 'bazi'  || systems === 'both') && !!baziChart;

    setLoadingMsg(needZiwei && needBazi ? '正在生成紫微 + 八字分析…' : needBazi ? '正在生成八字分析…' : '正在生成命理分析…');

    if (needBazi && baziChart) setBaziPromptText(getBaziAnalysisPrompt(baziChart, []));

    try {
      const [ziweiResult, baziResult] = await Promise.all([
        needZiwei ? generateAnalysis(chart, [], model) : Promise.resolve(null),
        needBazi  ? generateBaZiAnalysis(baziChart!, [], model) : Promise.resolve(null),
      ]);
      if (ziweiResult) setAnalysis(ziweiResult);
      if (baziResult)  setBaziAnalysis(baziResult);
      if (!needZiwei && !analysis) setAnalysis({ summary: '', palaceAnalysis: [], mutagenAnalysis: '', decadalFortune: '', eventAnalysis: [], keyFeatures: [] });
      setView('analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析生成失败');
      setView('chart');
    }
  }

  // ── 时辰推断 ─────────────────────────────────────────────────
  async function handleTimeInferenceSubmit(solarDate: string, gender: Gender, lifeInfo: LifeInfo) {
    setTiSolarDate(solarDate);
    setTiGender(gender);
    setTiLifeInfo(lifeInfo);
    setTiRefineCount(0);
    setView('time-loading');
    setLoadingMsg('正在生成 13 张候选命盘并比对…');
    setError('');
    try {
      const { result } = await inferBirthTime(solarDate, gender, lifeInfo, model);
      setTiResult(result);
      setView('time-result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '时辰推断失败，请重试');
      setView('time-input');
    }
  }

  // 用户回答澄清问题后再次推断
  async function handleTimeRefine(answers: Record<string, string>) {
    if (tiRefineCount >= TI_MAX_REFINES) return; // 已达上限，安全护栏
    const merged: LifeInfo = {
      ...tiLifeInfo,
      other: [tiLifeInfo.other ?? '', ...Object.values(answers).filter(v => v.trim())].filter(Boolean).join('\n'),
    };
    setTiLifeInfo(merged);
    setTiRefineCount(c => c + 1);
    setView('time-loading');
    setLoadingMsg('结合补充信息重新推断…');
    try {
      const { result } = await inferBirthTime(tiSolarDate, tiGender, merged, model);
      setTiResult(result);
      setView('time-result');
    } catch (e) {
      setError(e instanceof Error ? e.message : '推断失败');
      setView('time-result');
    }
  }

  // 用户从结果中选定时辰 → 排盘
  function handleTimePicked(timeIndex: number) {
    try {
      const c = generateChart(tiSolarDate, timeIndex, tiGender);
      handleChartGenerated(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : '排盘失败');
    }
  }

  // ── 全局顶栏 ─────────────────────────────────────────────────
  const globalBar = (
    <div className="global-bar">
      <ModelSelector value={model} onChange={setModel} />
      <button className="global-nav-btn" onClick={() => setView('home')}>首页</button>
      <button className="global-nav-btn" onClick={() => setView('library')}>命盘库</button>
    </div>
  );

  // ── 渲染 ─────────────────────────────────────────────────────

  if (view === 'home') {
    return (
      <>
        {globalBar}
        <HomeScreen
          onPickInput={() => setView('input')}
          onPickInfer={() => setView('time-input')}
          onPickLibrary={() => setView('library')}
        />
      </>
    );
  }

  if (view === 'input') {
    return (
      <>
        {globalBar}
        <InputForm onSubmit={handleChartGenerated} />
      </>
    );
  }

  if (view === 'library') {
    return (
      <>
        {globalBar}
        <ChartLibrary
          onSelect={handleRestoreChart}
          onBack={() => setView('home')}
        />
      </>
    );
  }

  if (view === 'time-input') {
    return (
      <>
        {globalBar}
        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
        <TimeInferenceForm
          value={tiForm}
          onChange={setTiForm}
          onSubmit={handleTimeInferenceSubmit}
          onBack={() => setView('home')}
        />
      </>
    );
  }

  if (view === 'time-loading') {
    return (
      <>
        {globalBar}
        <div style={loadingStyle}>
          <div style={spinnerStyle} />
          <p style={loadingTextStyle}>{loadingMsg}</p>
          <p style={{ ...loadingTextStyle, fontSize: '0.72rem', marginTop: '-0.5rem', color: '#b0a8a0' }}>
            模型：{model}
          </p>
        </div>
      </>
    );
  }

  if (view === 'time-result' && tiResult) {
    return (
      <>
        {globalBar}
        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
        <TimeInferenceResultPanel
          result={tiResult}
          solarDate={tiSolarDate}
          gender={tiGender}
          refineCount={tiRefineCount}
          maxRefines={TI_MAX_REFINES}
          onPickTime={handleTimePicked}
          onRefine={handleTimeRefine}
          onBack={() => setView('time-input')}
        />
      </>
    );
  }

  if (view === 'chart' && chart) {
    return (
      <>
        {globalBar}
        {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
        <ChartBoard
          chart={chart}
          baziChart={baziChart ?? undefined}
          onBack={() => setView('home')}
          onProceed={handleProceed}
        />
      </>
    );
  }

  if (view === 'dimension-picker' && chart) {
    return (
      <>
        {globalBar}
        <SplitLayout chart={chart}>
          {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
          <DimensionPicker
            onConfirm={handleDimensionsConfirmed}
            onViewOnly={handleViewOnly}
            onBack={() => { setView('chart'); setError(''); }}
          />
        </SplitLayout>
      </>
    );
  }

  if (view === 'loading-analysis' && chart) {
    return (
      <>
        {globalBar}
        <SplitLayout chart={chart}>
          <div style={loadingStyle}>
            <div style={spinnerStyle} />
            <p style={loadingTextStyle}>{loadingMsg}</p>
            <p style={{ ...loadingTextStyle, fontSize: '0.72rem', marginTop: '-0.5rem', color: '#b0a8a0' }}>
              模型：{model}
            </p>
          </div>
        </SplitLayout>
      </>
    );
  }

  if (view === 'analysis' && analysis && chart) {
    return (
      <>
        {globalBar}
        <SplitLayout chart={chart} baziChart={baziChart ?? undefined}>
          {error && <ErrorBanner msg={error} onClose={() => setError('')} />}
          <AnalysisPanel
            analysis={analysis}
            baziAnalysis={baziAnalysis ?? undefined}
            chart={chart}
            chartId={`${chart.solarDate}-${chart.time}-${chart.gender}`}
            promptText={promptText ?? undefined}
            baziPromptText={baziPromptText ?? undefined}
            onChat={(msgs: ChatMessage[]) => chatWithChart(chart, analysis, msgs, model)}
            onBack={() => { setView(selectedDimensions.length > 0 ? 'dimension-picker' : 'chart'); setError(''); }}
            onGenerateCompare={
              baziAnalysis && baziChart
                ? () => generateCompare(chart, baziChart, analysis, baziAnalysis, selectedDimensions, model)
                : undefined
            }
          />
        </SplitLayout>
      </>
    );
  }

  return null;
}

// ── HomeScreen ─────────────────────────────────────────────────
function HomeScreen({
  onPickInput, onPickInfer, onPickLibrary,
}: { onPickInput: () => void; onPickInfer: () => void; onPickLibrary: () => void }) {
  return (
    <div style={homeStyle}>
      <h1 style={homeTitleStyle}>紫微研习</h1>
      <p style={homeSubStyle}>命理分析 · 时辰推断</p>

      <div style={homeCardsStyle}>
        <button style={homeCardStyle} onClick={onPickInput}>
          <div style={homeCardIconStyle}>盘</div>
          <div style={homeCardTitleStyle}>已知生辰</div>
          <div style={homeCardDescStyle}>输入完整生日 + 时辰排盘分析</div>
        </button>

        <button style={homeCardStyle} onClick={onPickInfer}>
          <div style={homeCardIconStyle}>推</div>
          <div style={homeCardTitleStyle}>时辰推断</div>
          <div style={homeCardDescStyle}>不知道时辰？输入生日 + 关键信息推断</div>
        </button>

        <button style={homeCardStyle} onClick={onPickLibrary}>
          <div style={homeCardIconStyle}>库</div>
          <div style={homeCardTitleStyle}>命盘库</div>
          <div style={homeCardDescStyle}>查看历史保存的命盘记录</div>
        </button>
      </div>
    </div>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────
function ErrorBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div style={errorBannerStyle}>
      {msg}
      <button onClick={onClose} style={closeBtnStyle}>✕</button>
    </div>
  );
}

// ── ModelSelector ─────────────────────────────────────────────
import type { LLMModel as LLMModelType } from './lib/claude-api';
const MODEL_OPTIONS: { value: LLMModelType; label: string }[] = [
  { value: 'claude',          label: 'Claude Sonnet 4.5' },
  { value: 'claude-4-6',      label: 'Claude Sonnet 4.6' },
  { value: 'claude-4-7',      label: 'Claude Sonnet 4.7' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7'   },
  { value: 'gemini-3-flash',  label: 'Gemini 3 Flash'    },
  { value: 'gemini-3-pro',    label: 'Gemini 3.1 Pro'    },
];

function ModelSelector({ value, onChange }: { value: LLMModelType; onChange: (m: LLMModelType) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as LLMModelType)} className="global-model-select">
      {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── 样式 ──────────────────────────────────────────────────────
const homeStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  paddingTop: 'calc(2.5rem + 2rem)',
};

const homeTitleStyle: React.CSSProperties = {
  fontFamily: 'Noto Serif SC, serif', fontSize: '2.6rem',
  color: '#c87d8a', letterSpacing: '0.2em',
  margin: '0 0 0.4rem',
};

const homeSubStyle: React.CSSProperties = {
  fontFamily: 'Noto Sans SC, sans-serif', fontSize: '0.95rem',
  color: '#8a7f7f', letterSpacing: '0.15em',
  margin: '0 0 2.6rem',
};

const homeCardsStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '1.2rem', maxWidth: 760, width: '100%',
};

const homeCardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e8ddd4',
  borderRadius: 12, padding: '1.5rem 1.2rem',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  gap: '0.5rem', cursor: 'pointer',
  boxShadow: '0 1px 6px rgba(180,160,140,0.08)',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: 'inherit',
};

const homeCardIconStyle: React.CSSProperties = {
  fontFamily: 'Noto Serif SC, serif', fontSize: '1.5rem',
  color: '#c87d8a', background: '#fff7f5',
  border: '1px solid #c87d8a40', borderRadius: '50%',
  width: 48, height: 48,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: '0.4rem',
};

const homeCardTitleStyle: React.CSSProperties = {
  fontFamily: 'Noto Serif SC, serif', fontSize: '1.1rem',
  color: '#4a3f3f', letterSpacing: '0.1em',
};

const homeCardDescStyle: React.CSSProperties = {
  fontFamily: 'Noto Sans SC, sans-serif', fontSize: '0.78rem',
  color: '#8a7f7f', textAlign: 'center', lineHeight: 1.5,
};

const loadingStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: '80vh', gap: '1.2rem',
};

const spinnerStyle: React.CSSProperties = {
  width: 32, height: 32,
  border: '2px solid #e8ddd4', borderTopColor: '#c87d8a',
  borderRadius: '50%', animation: 'spin 0.8s linear infinite',
};

const loadingTextStyle: React.CSSProperties = {
  fontFamily: 'Noto Sans SC, sans-serif',
  fontSize: '0.85rem', color: '#8a7f7f', letterSpacing: '0.05em',
};

const errorBannerStyle: React.CSSProperties = {
  position: 'fixed', top: '2.5rem', left: 0, right: 0, zIndex: 200,
  background: '#fef2f2', borderBottom: '1px solid #d47070',
  color: '#d47070', fontFamily: 'Noto Sans SC, sans-serif',
  fontSize: '0.82rem', padding: '0.4rem 1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#d47070', cursor: 'pointer',
};
