import { useState, useMemo } from 'react';
import type { ChartAnalysis } from '../../types';
import { DIMENSIONS } from '../../types';
import type { ChatMessage } from '../../lib/claude-api';
import type { Astrolabe } from '../../lib/iztro-wrapper';
import { verifyAnalysis } from '../../lib/chart-verify';
import ChatPanel from '../Chat/ChatPanel';
import './AnalysisPanel.css';

interface AnalysisPanelProps {
  analysis: ChartAnalysis;
  chart?: Astrolabe;
  chartId?: string;
  promptText?: { system: string; user: string };
  onChat?: (messages: ChatMessage[]) => Promise<string>;
  onStartQuiz: () => void;
  onBack: () => void;
}

function dimLabel(key: string): string {
  return DIMENSIONS.find(d => d.key === key)?.label ?? key;
}

export default function AnalysisPanel({ analysis, chart, chartId, promptText, onChat, onStartQuiz, onBack }: AnalysisPanelProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showChat, setShowChat]     = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [copied, setCopied]         = useState(false);

  const verifyResult = useMemo(() => {
    if (!chart) return null;
    return verifyAnalysis(chart, analysis);
  }, [chart, analysis]);

  function handleCopyPrompt() {
    if (!promptText) return;
    const text = `【系统提示词】\n${promptText.system}\n\n【用户提示词】\n${promptText.user}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="analysis-page">
      <div className="analysis-header">
        <button className="back-btn" onClick={onBack}>← 返回命盘</button>
        <h2 className="analysis-title">命理分析</h2>
        <div className="analysis-header-actions">
          {promptText && (
            <button
              className="prompt-export-btn"
              onClick={() => setShowPrompt(v => !v)}
            >
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

      {/* 提示词导出面板 */}
      {showPrompt && promptText && (
        <div className="prompt-panel">
          <div className="prompt-panel-header">
            <span className="prompt-panel-title">AI 提示词</span>
            <button className="prompt-copy-btn" onClick={handleCopyPrompt}>
              {copied ? '已复制' : '复制全部'}
            </button>
          </div>
          <div className="prompt-section">
            <div className="prompt-label">系统提示词</div>
            <pre className="prompt-text">{promptText.system}</pre>
          </div>
          <div className="prompt-section">
            <div className="prompt-label">用户提示词</div>
            <pre className="prompt-text">{promptText.user}</pre>
          </div>
        </div>
      )}

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
