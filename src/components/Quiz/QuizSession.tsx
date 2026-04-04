import { useState } from 'react';
import type { QuizQuestion, ChartAnalysis, SelfEval, QuizSession as QuizSessionType, AnswerRecord, Dimension } from '../../types';
import { DIMENSIONS } from '../../types';
import QuestionCard from './QuestionCard';
import './Quiz.css';

interface QuizSessionProps {
  questions: QuizQuestion[];
  analysis: ChartAnalysis;
  chartId: string;
  chartSnapshot: string;
  chartLabel: string;
  selectedDimensions: Dimension[];
  onAddDimension: (dim: Dimension) => void;
  onComplete: (session: QuizSessionType) => void;
  onBack: () => void;
}

export default function QuizSession({
  questions,
  analysis,
  chartId,
  chartSnapshot,
  chartLabel,
  selectedDimensions,
  onAddDimension,
  onComplete,
  onBack,
}: QuizSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState<AnswerRecord[]>([]);
  const [showAddDim, setShowAddDim]     = useState(false);

  const unselectedDims = DIMENSIONS.filter(
    d => !selectedDimensions.find(sd => sd.key === d.key)
  );

  function handleAnswer(userAnswer: string, selfEval: SelfEval) {
    const q = questions[currentIndex];
    const record: AnswerRecord = {
      questionId:        q.id,
      dimension:         q.dimension,
      dimensionCategory: q.dimensionCategory,
      userAnswer,
      selfEval,
    };
    const newAnswers = [...answers, record];
    setAnswers(newAnswers);

    if (currentIndex + 1 >= questions.length) {
      // 完成所有题目
      const session: QuizSessionType = {
        id:            `${chartId}-${Date.now()}`,
        chartId,
        date:          new Date().toISOString(),
        chartSnapshot,
        chartLabel,
        answers:       newAnswers,
      };
      onComplete(session);
    } else {
      setTimeout(() => setCurrentIndex(i => i + 1), 400);
    }
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="quiz-page">
      <div className="quiz-header">
        <button className="back-btn" onClick={onBack}>← 返回分析</button>
        <div className="quiz-info">
          <span className="quiz-chart-label">{chartLabel}</span>
        </div>
        <button className="add-dim-btn" onClick={() => setShowAddDim(!showAddDim)}>
          + 添加维度
        </button>
      </div>

      {/* 添加维度面板 */}
      {showAddDim && unselectedDims.length > 0 && (
        <div className="add-dim-panel">
          <div className="add-dim-title">添加学习维度（不影响已答进度）</div>
          <div className="dim-chips">
            {unselectedDims.map(d => (
              <button
                key={d.key}
                className="dim-chip"
                onClick={() => { onAddDimension(d); setShowAddDim(false); }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 维度分组进度 */}
      <div className="quiz-dim-progress">
        {selectedDimensions.map(dim => {
          const dimQuestions = questions.filter(q => q.dimension === dim.key);
          const answered     = answers.filter(a => a.dimension === dim.key).length;
          return (
            <div key={dim.key} className="dim-progress-item">
              <span className="dim-progress-label">{dim.label}</span>
              <span className="dim-progress-count">{answered}/{dimQuestions.length}</span>
            </div>
          );
        })}
      </div>

      {/* 当前题目 */}
      {currentQ && (
        <div className="quiz-content">
          <QuestionCard
            key={currentQ.id}
            question={currentQ}
            index={currentIndex}
            total={questions.length}
            onSubmit={handleAnswer}
          />
        </div>
      )}

      {/* 分析参考（折叠显示） */}
      <details className="analysis-reference">
        <summary>查看命理分析（参考）</summary>
        <p className="analysis-ref-summary">{analysis.summary}</p>
      </details>
    </div>
  );
}
