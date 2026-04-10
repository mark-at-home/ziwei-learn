import { useState, useMemo } from 'react';
import type { ChartAnalysis } from '../../types';
import { DIMENSIONS } from '../../types';
import type { BaZiAnalysis, CompareAnalysis } from '../../types/bazi';
import type { ChatMessage } from '../../lib/claude-api';
import type { Astrolabe } from '../../lib/iztro-wrapper';
import { verifyAnalysis } from '../../lib/chart-verify';
import BaZiAnalysisPanel from './BaZiAnalysisPanel';
import ComparePanel from '../Compare/ComparePanel';
import ChatPanel from '../Chat/ChatPanel';
import './AnalysisPanel.css';

interface AnalysisPanelProps {
  analysis: ChartAnalysis;
  baziAnalysis?: BaZiAnalysis;
  chart?: Astrolabe;
  chartId?: string;
  promptText?: { system: string; user: string };
  baziPromptText?: { system: string; user: string };
  onChat?: (messages: ChatMessage[]) => Promise<string>;
  onStartQuiz: () => void;
  onBack: () => void;
  onGenerateCompare?: () => Promise<{ result: CompareAnalysis; promptText: string }>;
}

type AnalysisTab = 'ziwei' | 'bazi';
type PromptTab   = 'ziwei' | 'bazi' | 'compare';

function dimLabel(key: string): string {
  return DIMENSIONS.find(d => d.key === key)?.label ?? key;
}

export default function AnalysisPanel({
  analysis, baziAnalysis, chart, chartId, promptText, baziPromptText, onChat,
  onStartQuiz, onBack, onGenerateCompare,
}: AnalysisPanelProps) {
  const [showPrompt, setShowPrompt]       = useState(false);
  const [promptTab, setPromptTab]         = useState<PromptTab>('ziwei');
  const [showChat, setShowChat]           = useState(false);
  const [showVerify, setShowVerify]       = useState(false);
  const [copied, setCopied]               = useState(false);
  const [activeTab, setActiveTab]         = useState<AnalysisTab>('ziwei');
  const [compare, setCompare]               = useState<CompareAnalysis | null>(null);
  const [comparePromptText, setComparePromptText] = useState<string>('');
  const [showCompare, setShowCompare]       = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const verifyResult = useMemo(() => {
    if (!chart) return null;
    return verifyAnalysis(chart, analysis);
  }, [chart, analysis]);

  const hasAnyPrompt = !!(promptText || baziPromptText);

  function currentPromptData(): { system: string; user: string } | null {
    if (promptTab === 'ziwei') return promptText ?? null;
    if (promptTab === 'bazi')  return baziPromptText ?? null;
    if (promptTab === 'compare' && comparePromptText) return { system: '（见下方用户提示词）', user: comparePromptText };
    return null;
  }

  function handleCopyPrompt() {
    const pt = currentPromptData();
    if (!pt) return;
    const text = `【系统提示词】\n${pt.system}\n\n【用户提示词】\n${pt.user}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleCompare() {
    if (!onGenerateCompare) return;
    if (compare) { setShowCompare(v => !v); return; }
    setLoadingCompare(true);
    try {
      const { result, promptText: pt } = await onGenerateCompare();
      setCompare(result);
      setComparePromptText(pt);
      setShowCompare(true);
    } finally {
      setLoadingCompare(false);
    }
  }

  const hasBoth = !!baziAnalysis;

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>← 返回命盘</button>
        <h2 className="analysis-title">命理分析</h2>
        <div className="analysis-header-actions">
          {hasAnyPrompt && (
            <button className="prompt-export-btn" onClick={() => setShowPrompt(v => !v)}>
              {showPrompt ? '收起提示词' : '查看提示词'}
            </button>
          )}
          {verifyResult && (
            <button
              className={`prompt-export-btn${showVerify ? ' prompt-export-btn--active' : ''}`}
              onClick={() => setShowVerify(v => !v)}
              style={verifyResult.length > 0 ? { borderColor: '#d4707060', color: '#d47070' } : undefined}
            >
              {showVerify ? '收起验证' : `数据验证${verifyResult.length > 0 ? ` (${verifyResult.length})` : ''}`}
            </button>
          )}
          {hasBoth && onGenerateCompare && (
            <button
              className={`prompt-export-btn${showCompare ? ' prompt-export-btn--active' : ''}`}
              onClick={handleCompare}
              disabled={loadingCompare}
            >
              {loadingCompare ? '生成对比中…' : showCompare ? '收起对比' : '紫微 × 八字'}
            </button>
          )}
          {onChat && (
            <button
              className={`chat-toggle-btn-header ${showChat ? 'chat-toggle-btn-header--active' : ''}`}
              onClick={() => setShowChat(v => !v)}
            >
              {showChat ? '收起问答' : '问命师'}
            </button>
          )}
        </div>
      </div>

      {/* 提示词面板（多 tab）*/}
      {showPrompt && hasAnyPrompt && (() => {
        const pt = currentPromptData();
        return (
          <div className="prompt-panel">
            <div className="prompt-panel-header">
              {/* Tab 切换 */}
              <div className="prompt-tab-row">
                {promptText && (
                  <button
                    className={`prompt-tab-btn${promptTab === 'ziwei' ? ' prompt-tab-btn--active' : ''}`}
                    onClick={() => setPromptTab('ziwei')}
                  >紫微</button>
                )}
                {baziPromptText && (
                  <button
                    className={`prompt-tab-btn${promptTab === 'bazi' ? ' prompt-tab-btn--active' : ''}`}
                    onClick={() => setPromptTab('bazi')}
                  >八字</button>
                )}
                {compare && (
                  <button
                    className={`prompt-tab-btn${promptTab === 'compare' ? ' prompt-tab-btn--active' : ''}`}
                    onClick={() => setPromptTab('compare')}
                  >对比</button>
                )}
              </div>
              <button className="prompt-copy-btn" onClick={handleCopyPrompt}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            {pt && (
              <>
                <div className="prompt-section">
                  <div className="prompt-label">系统提示词</div>
                  <pre className="prompt-text">{pt.system}</pre>
                </div>
                <div className="prompt-section">
                  <div className="prompt-label">用户提示词</div>
                  <pre className="prompt-text">{pt.user}</pre>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* 数据验证面板 */}
      {showVerify && verifyResult && (
        <div className="prompt-panel" style={{ borderColor: verifyResult.length > 0 ? '#d4707040' : '#7bba9a40' }}>
          <div className="prompt-panel-header">
            <span className="prompt-panel-title" style={{ color: verifyResult.length > 0 ? '#d47070' : '#7bba9a' }}>
              {verifyResult.length > 0 ? `发现 ${verifyResult.length} 处数据不一致` : '数据验证通过'}
            </span>
          </div>
          {verifyResult.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: '#7bba9a', fontFamily: 'Noto Sans SC, sans-serif' }}>
              AI 分析中引用的星曜、宫位、四化数据与命盘一致。
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {verifyResult.map((w, i) => (
                <div key={i} style={{
                  fontSize: '0.8rem', color: '#d47070', fontFamily: 'Noto Sans SC, sans-serif',
                  padding: '0.3rem 0.5rem', background: '#d4707008', borderRadius: '6px',
                  borderLeft: '2px solid #d47070',
                }}>
                  {w.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 对比面板 */}
      {showCompare && compare && (
        <ComparePanel compare={compare} onClose={() => setShowCompare(false)} />
      )}

      {/* 系统 tab（有八字时显示） */}
      {hasBoth && (
        <div className="analysis-tab-row">
          <button
            className={`analysis-tab-btn${activeTab === 'ziwei' ? ' analysis-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('ziwei')}
          >紫微斗数</button>
          <button
            className={`analysis-tab-btn${activeTab === 'bazi' ? ' analysis-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('bazi')}
          >八字</button>
        </div>
      )}

      {/* 八字分析 */}
      {activeTab === 'bazi' && baziAnalysis && (
        <BaZiAnalysisPanel analysis={baziAnalysis} />
      )}

      {/* 紫微分析 */}
      {activeTab === 'ziwei' && (
        <div className="analysis-content">
          {/* 总述 */}
          <section className="analysis-section">
            <div className="section-tag">概述</div>
            <p className="analysis-summary">{analysis.summary}</p>
          </section>

          {/* 宫位分析 */}
          {analysis.palaceAnalysis.length > 0 && (
            <section className="analysis-section">
              <div className="section-tag">宫位解读</div>
              {analysis.palaceAnalysis.map((pa, i) => (
                <div key={i} className="palace-analysis-card">
                  <div className="palace-analysis-header">
                    <span className="palace-analysis-name">{pa.palace}</span>
                    <span className="palace-analysis-stars">{pa.stars.join('、')}</span>
                  </div>
                  <p className="palace-analysis-text">{pa.interpretation}</p>
                  <div className="reasoning-block">
                    <span className="reasoning-label">推理依据</span>
                    <p className="reasoning-text">{pa.reasoning}</p>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 四化分析 */}
          {analysis.mutagenAnalysis && (
            <section className="analysis-section">
              <div className="section-tag">四化飞星</div>
              <p className="analysis-text">{analysis.mutagenAnalysis}</p>
            </section>
          )}

          {/* 大限走势 */}
          {analysis.decadalFortune && (
            <section className="analysis-section">
              <div className="section-tag">大限走势</div>
              <p className="analysis-text">{analysis.decadalFortune}</p>
            </section>
          )}

          {/* 维度分析 */}
          {analysis.eventAnalysis.map((ea, i) => (
            <section key={i} className="analysis-section">
              <div className="section-tag event-tag">{dimLabel(ea.dimension)}</div>
              <p className="analysis-text">{ea.content}</p>
              <div className="reasoning-block">
                <span className="reasoning-label">推理依据</span>
                <p className="reasoning-text">{ea.reasoning}</p>
              </div>
            </section>
          ))}

          {/* 核心特征 */}
          {analysis.keyFeatures.length > 0 && (
            <section className="analysis-section">
              <div className="section-tag">命盘核心特征</div>
              <ul className="key-features">
                {analysis.keyFeatures.map((f, i) => (
                  <li key={i} className="key-feature-item">{f}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* 自由问答面板 */}
      {showChat && onChat && chartId && (
        <ChatPanel chartId={chartId} onSend={onChat} onClose={() => setShowChat(false)} />
      )}

      <div className="analysis-footer">
        <button className="btn-secondary" onClick={onBack}>返回命盘</button>
        <button className="btn-primary" onClick={onStartQuiz}>开始答题 →</button>
      </div>
    </div>
  );
}
