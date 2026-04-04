import { useState } from 'react';
import type { QuizQuestion, SelfEval } from '../../types';
import './Quiz.css';

interface QuestionCardProps {
  question: QuizQuestion;
  index: number;
  total: number;
  onSubmit: (userAnswer: string, selfEval: SelfEval) => void;
}

export default function QuestionCard({ question, index, total, onSubmit }: QuestionCardProps) {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textAnswer, setTextAnswer]         = useState<string>('');
  const [submitted, setSubmitted]           = useState<boolean>(false);
  const [showReasoning, setShowReasoning]   = useState<boolean>(false);
  const [selfEval, setSelfEval]             = useState<SelfEval | null>(null);

  const isObjective = question.type === 'objective';
  const userAnswer  = isObjective ? selectedOption : textAnswer;
  const canSubmit   = submitted ? false : userAnswer.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    setSubmitted(true);
  }

  function handleSelfEval(eval_: SelfEval) {
    setSelfEval(eval_);
    onSubmit(userAnswer, eval_);
  }

  const SELF_EVAL_LABELS: { key: SelfEval; label: string; color: string }[] = [
    { key: 'accurate', label: '准确',     color: '#4a8c5c' },
    { key: 'partial',  label: '部分准确', color: '#c9a84c' },
    { key: 'off',      label: '有偏差',   color: '#8b1a1a' },
  ];

  return (
    <div className="question-card">
      {/* 进度 */}
      <div className="question-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span className="progress-text">第 {index + 1} / {total} 题</span>
      </div>

      {/* 考察点标签 */}
      <div className="question-meta">
        <span className="question-topic">{question.topic}</span>
        <span className="question-difficulty">{'★'.repeat(question.difficulty)}</span>
      </div>

      {/* 题目 */}
      <p className="question-text">{question.question}</p>

      {/* 作答区 */}
      {isObjective ? (
        <div className="options-list">
          {question.options?.map((opt, i) => (
            <button
              key={i}
              className={`option-btn ${selectedOption === opt ? 'option-btn--selected' : ''} ${submitted && opt === question.referenceAnswer ? 'option-btn--correct' : ''} ${submitted && selectedOption === opt && opt !== question.referenceAnswer ? 'option-btn--wrong' : ''}`}
              onClick={() => !submitted && setSelectedOption(opt)}
              disabled={submitted}
            >
              <span className="option-letter">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
            </button>
          ))}
        </div>
      ) : (
        <textarea
          className="text-answer"
          placeholder="请输入你的分析..."
          value={textAnswer}
          onChange={e => setTextAnswer(e.target.value)}
          disabled={submitted}
          rows={4}
        />
      )}

      {/* 提交按钮 */}
      {!submitted && (
        <button
          className="btn-submit"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          提交答案
        </button>
      )}

      {/* 提交后：参考答案 */}
      {submitted && (
        <div className="answer-section">
          <div className="answer-header">
            <span className="answer-label">参考答案</span>
          </div>
          <p className="reference-answer">{question.referenceAnswer}</p>

          {/* 推理路径（可折叠） */}
          <button
            className="reasoning-toggle"
            onClick={() => setShowReasoning(!showReasoning)}
          >
            {showReasoning ? '收起' : '展开'}推理路径
          </button>

          {showReasoning && (
            <ol className="reasoning-path">
              {question.reasoningPath.map((step, i) => (
                <li key={i} className="reasoning-step">{step}</li>
              ))}
            </ol>
          )}

          {/* 自评 */}
          {!selfEval ? (
            <div className="self-eval-section">
              <div className="self-eval-label">你的理解程度</div>
              <div className="self-eval-btns">
                {SELF_EVAL_LABELS.map(({ key, label, color }) => (
                  <button
                    key={key}
                    className="self-eval-btn"
                    style={{ '--eval-color': color } as React.CSSProperties}
                    onClick={() => handleSelfEval(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="self-eval-result">
              已记录：{SELF_EVAL_LABELS.find(e => e.key === selfEval)?.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
