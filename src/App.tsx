import { useState } from 'react';
import InputForm from './components/InputForm/InputForm';
import ChartBoard from './components/ChartBoard/ChartBoard';
import DimensionPicker from './components/DimensionPicker/DimensionPicker';
import type { SystemSelection } from './components/DimensionPicker/DimensionPicker';
import AnalysisPanel from './components/Analysis/AnalysisPanel';
import QuizSession from './components/Quiz/QuizSession';
import ProgressDashboard from './components/Progress/ProgressDashboard';
import SplitLayout from './components/SplitLayout/SplitLayout';
import ChartLibrary from './components/ChartLibrary/ChartLibrary';
import type { Astrolabe } from './lib/iztro-wrapper';
import { getChartId, getChartLabel, generateChart, TIME_NAMES } from './lib/iztro-wrapper';
import type { Gender } from './lib/iztro-wrapper';
import { chartToPromptText } from './lib/chart-to-text';
import {
  generateAnalysis, generateQuiz, getAnalysisPrompt, chatWithChart,
  generateBaZiAnalysis, getBaziAnalysisPrompt, generateCompare,
} from './lib/claude-api';
import type { ChatMessage } from './lib/claude-api';
import type { LLMModel } from './lib/claude-api';
import { saveSession, saveChartRecord, loadChartRecord } from './lib/storage';
import type { ChartAnalysis, Dimension, QuizQuestion, QuizSession as QuizSessionType } from './types';
import type { BaZiChart, BaZiAnalysis } from './types/bazi';
import { generateBaZiChart, timeIndexToHour } from './lib/bazi-wrapper';

type AppView =
  | 'input'
  | 'chart'
  | 'library'
  | 'dimension-picker'
  | 'loading-analysis'
  | 'analysis'
  | 'loading-quiz'
  | 'quiz'
  | 'quiz-complete'
  | 'progress';

export default function App() {
  const [view, setView]                   = useState<AppView>('input');
  const [chart, setChart]                 = useState<Astrolabe | null>(null);
  const [baziChart, setBaziChart]         = useState<BaZiChart | null>(null);
  const [analysis, setAnalysis]           = useState<ChartAnalysis | null>(null);
  const [baziAnalysis, setBaziAnalysis]   = useState<BaZiAnalysis | null>(null);
  const [activeSystems, setActiveSystems] = useState<SystemSelection>('ziwei');
  const [questions, setQuestions]         = useState<QuizQuestion[]>([]);
  const [selectedDimensions, setSelected] = useState<Dimension[]>([]);
  const [loadingMsg, setLoadingMsg]       = useState('');
  const [error, setError]                 = useState('');
  const [model, setModel]                 = useState<LLMModel>('gemini');
  const [promptText, setPromptText]       = useState<{ system: string; user: string } | null>(null);

  // ── 排盘完成 ─────────────────────────────────────────────────
  function handleChartGenerated(c: Astrolabe) {
    setChart(c);
    setAnalysis(null);
    setBaziAnalysis(null);
    setQuestions([]);
    setSelected([]);
    setError('');
    saveChartRecord(c);   // 自动存入命盘库
    // 同时生成八字命盘
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
    // 重新生成 Astrolabe 实例：JSON 序列化会丢失类方法（如 horoscope()），直接用原始参数重建
    const stored = record.astrolabe as Astrolabe & { time: string; gender: string };
    const timeStr = stored.time ?? '';
    const timeIndex = TIME_NAMES.findIndex(t => timeStr.startsWith(t));
    // chart.gender 存储的是 iztro 中文本地化值 '男'/'女'，不是 'male'/'female'
    const gender = (stored.gender === '女' ? 'female' : 'male') as Gender;
    const freshChart = generateChart(record.solarDate, timeIndex >= 0 ? timeIndex : 0, gender);
    setChart(freshChart);
    setAnalysis(null);
    setBaziAnalysis(null);
    setQuestions([]);
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
    setActiveSystems(systems);
    setPromptText(getAnalysisPrompt(chart, dims));
    setView('loading-analysis');

    const needZiwei = systems === 'ziwei' || systems === 'both';
    const needBazi  = (systems === 'bazi'  || systems === 'both') && !!baziChart;

    setLoadingMsg(needZiwei && needBazi ? '正在生成紫微 + 八字分析…' : needBazi ? '正在生成八字分析…' : '正在生成命理分析…');

    try {
      const [ziweiResult, baziResult] = await Promise.all([
        needZiwei ? generateAnalysis(chart, dims, model) : Promise.resolve(null),
        needBazi  ? generateBaZiAnalysis(baziChart!, dims, model) : Promise.resolve(null),
      ]);
      if (ziweiResult) setAnalysis(ziweiResult);
      if (baziResult)  setBaziAnalysis(baziResult);
      // if only bazi was run, keep existing ziwei analysis (or set empty fallback)
      if (!needZiwei && !analysis) setAnalysis({ summary: '', palaceAnalysis: [], mutagenAnalysis: '', decadalFortune: '', eventAnalysis: [], keyFeatures: [] });
      setView('analysis');
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析生成失败，请确认代理服务已启动');
      setView('dimension-picker');
    }
  }

  async function handleViewOnly(systems: SystemSelection) {
    if (!chart) return;
    setActiveSystems(systems);
    setPromptText(getAnalysisPrompt(chart, []));
    setView('loading-analysis');

    const needZiwei = systems === 'ziwei' || systems === 'both';
    const needBazi  = (systems === 'bazi'  || systems === 'both') && !!baziChart;

    setLoadingMsg(needZiwei && needBazi ? '正在生成紫微 + 八字分析…' : needBazi ? '正在生成八字分析…' : '正在生成命理分析…');

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

  // ── 开始答题 ─────────────────────────────────────────────────
  async function handleStartQuiz() {
    if (!chart || !analysis) return;
    setView('loading-quiz');
    setLoadingMsg('正在生成题目…');
    try {
      const qs = await generateQuiz(chart, analysis, selectedDimensions, model);
      setQuestions(qs);
      setView('quiz');
    } catch (e) {
      setError(e instanceof Error ? e.message : '出题失败，请重试');
      setView('analysis');
    }
  }

  async function handleAddDimension(dim: Dimension) {
    if (!chart || !analysis) return;
    setSelected(prev => [...prev, dim]);
    try {
      const extra = await generateQuiz(chart, analysis, [dim], model);
      setQuestions(prev => [...prev, ...extra]);
    } catch { /* 静默失败 */ }
  }

  function handleQuizComplete(session: QuizSessionType) {
    saveSession(session);
    setView('quiz-complete');
  }

  // ── 全局顶栏 ─────────────────────────────────────────────────
  const globalBar = (
    <div className="global-bar">
      <ModelSelector value={model} onChange={setModel} />
      <button className="global-nav-btn" onClick={() => setView('library')}>命盘库</button>
      <button className="global-nav-btn" onClick={() => setView('progress')}>学习进度</button>
    </div>
  );

  // ── 渲染 ─────────────────────────────────────────────────────

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
          onBack={() => setView('input')}
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
          onBack={() => setView('input')}
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

  if ((view === 'loading-analysis' || view === 'loading-quiz') && chart) {
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
            chartId={getChartId(chart)}
            promptText={promptText ?? undefined}
            onChat={(msgs: ChatMessage[]) => chatWithChart(chart, analysis, msgs, model)}
            onStartQuiz={selectedDimensions.length > 0 ? handleStartQuiz : () => {}}
            onBack={() => { setView(selectedDimensions.length > 0 ? 'dimension-picker' : 'chart'); setError(''); }}
            onGenerateCompare={
              baziAnalysis && baziChart
                ? () => generateCompare(chart, baziChart, analysis, baziAnalysis, model)
                : undefined
            }
          />
        </SplitLayout>
      </>
    );
  }

  if (view === 'quiz' && chart && analysis) {
    return (
      <>
        {globalBar}
        <SplitLayout chart={chart}>
          <QuizSession
            questions={questions}
            analysis={analysis}
            chartId={getChartId(chart)}
            chartSnapshot={chartToPromptText(chart)}
            chartLabel={getChartLabel(chart)}
            selectedDimensions={selectedDimensions}
            onAddDimension={handleAddDimension}
            onComplete={handleQuizComplete}
            onBack={() => setView('analysis')}
          />
        </SplitLayout>
      </>
    );
  }

  if (view === 'quiz-complete') {
    return (
      <>
        {globalBar}
        <div style={completeStyle}>
          <div style={completeTitleStyle}>本轮学习完成</div>
          <p style={completeSubStyle}>答题记录已保存</p>
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={btnSecStyle} onClick={() => setView('input')}>重新排盘</button>
            <button style={btnSecStyle} onClick={() => chart && setView('dimension-picker')}>继续学习其他维度</button>
            <button style={btnPriStyle} onClick={() => setView('progress')}>查看进度</button>
          </div>
        </div>
      </>
    );
  }

  if (view === 'progress') {
    return (
      <>
        {globalBar}
        <ProgressDashboard onBack={() => setView('input')} />
      </>
    );
  }

  return null;
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
  { value: 'claude',          label: 'Claude Sonnet 4.5'   },
  { value: 'claude-4-6',      label: 'Claude Sonnet 4.6'   },
  { value: 'gemini',          label: 'Gemini 2.5 Flash'    },
  { value: 'gemini-pro',      label: 'Gemini 2.5 Pro'      },
  { value: 'gemini-thinking', label: 'Gemini 2.5 Thinking' },
  { value: 'gemini-3-flash',  label: 'Gemini 3 Flash'      },
  { value: 'gemini-3-pro',    label: 'Gemini 3.1 Pro'      },
];

function ModelSelector({ value, onChange }: { value: LLMModelType; onChange: (m: LLMModelType) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value as LLMModelType)} className="global-model-select">
      {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

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

const completeStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: '100vh', padding: '1.5rem',
  paddingTop: '4rem',
};

const completeTitleStyle: React.CSSProperties = {
  fontFamily: 'Noto Serif SC, serif', fontSize: '1.4rem',
  color: '#c87d8a', letterSpacing: '0.15em',
};

const completeSubStyle: React.CSSProperties = {
  fontFamily: 'Noto Sans SC, sans-serif', fontSize: '0.85rem',
  color: '#8a7f7f', marginTop: '0.5rem',
};

const btnPriStyle: React.CSSProperties = {
  background: '#c87d8a', border: 'none', borderRadius: 8,
  color: '#ffffff', fontFamily: 'Noto Serif SC, serif',
  fontSize: '0.9rem', fontWeight: 700, padding: '0.6rem 1.2rem', cursor: 'pointer',
};

const btnSecStyle: React.CSSProperties = {
  background: 'transparent', border: '1px solid #e8ddd4', borderRadius: 8,
  color: '#8a7f7f', fontFamily: 'Noto Sans SC, sans-serif',
  fontSize: '0.85rem', padding: '0.6rem 1.2rem', cursor: 'pointer',
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
