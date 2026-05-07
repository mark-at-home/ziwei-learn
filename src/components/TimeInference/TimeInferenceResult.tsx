import { useState } from 'react';
import type { TimeInferenceResult, TimeCandidate, ClarifyQuestion } from '../../types/time-inference';
import './TimeInferenceResult.css';

interface TimeInferenceResultProps {
  result: TimeInferenceResult;
  solarDate: string;
  gender: 'male' | 'female';
  refineCount: number;
  maxRefines: number;
  onPickTime: (timeIndex: number) => void;
  onRefine: (answers: Record<string, string>) => void;
  onBack: () => void;
}

const VERDICT_TEXT = {
  unique:   { label: '已确定时辰', color: '#7bba9a' },
  multiple: { label: '多个候选符合，需要进一步区分', color: '#c9a84c' },
  none:     { label: '信息不足，无候选高度符合', color: '#d47070' },
};

export default function TimeInferenceResultPanel({
  result, solarDate, gender, refineCount, maxRefines, onPickTime, onRefine, onBack,
}: TimeInferenceResultProps) {
  const [showAll, setShowAll] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { candidates, threshold, shortlist, verdict, questions, reasoning } = result;

  // shortlist 优先展示；其余的归到"参考"
  const shortlistCandidates = candidates.filter(c => shortlist.includes(c.timeIndex));
  const restCandidates      = candidates.filter(c => !shortlist.includes(c.timeIndex));

  const verdictMeta  = VERDICT_TEXT[verdict];
  const reachedCap   = refineCount >= maxRefines;
  const hasQuestions = questions.length > 0 && verdict !== 'unique' && !reachedCap;
  const showStrategies = verdict !== 'unique' && reachedCap;

  function answerQuestion(q: ClarifyQuestion, val: string) {
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }

  function handleRefine() {
    if (Object.values(answers).every(v => !v.trim())) return;
    onRefine(answers);
  }

  return (
    <div className="ti-result">
      <div className="ti-result-header">
        <button className="back-btn" onClick={onBack}>← 重新输入</button>
        <h2 className="analysis-title">推断结果</h2>
      </div>

      <div className="ti-result-body">
        <div className="ti-result-meta">
          <span>{solarDate} · {gender === 'male' ? '男命' : '女命'}</span>
          <span className="ti-confidence" style={{ color: verdictMeta.color, borderColor: verdictMeta.color + '60' }}>
            {verdictMeta.label}
          </span>
        </div>

        <div className="ti-overall-reasoning">
          <div className="ti-label">推断说明（阈值 ≥ {threshold}%）</div>
          <p>{reasoning}</p>
        </div>

        {/* shortlist：高度符合的候选 */}
        {shortlistCandidates.length > 0 && (
          <div className="ti-candidates">
            <div className="ti-label">
              {verdict === 'unique'
                ? '唯一高度符合的时辰'
                : `${shortlistCandidates.length} 个候选概率 ≥ ${threshold}%`}
            </div>
            {shortlistCandidates.map((c, idx) => (
              <CandidateCard
                key={c.timeIndex}
                candidate={c}
                rank={idx + 1}
                emphasized={verdict === 'unique' || idx === 0}
                threshold={threshold}
                onPick={() => onPickTime(c.timeIndex)}
              />
            ))}
          </div>
        )}

        {/* none 情况：显示概率最高的几个作为参考 */}
        {verdict === 'none' && (
          <div className="ti-candidates">
            <div className="ti-label">概率最高的 3 个时辰（均未达阈值）</div>
            {candidates.slice(0, 3).map((c, idx) => (
              <CandidateCard
                key={c.timeIndex}
                candidate={c}
                rank={idx + 1}
                emphasized={false}
                threshold={threshold}
                onPick={() => onPickTime(c.timeIndex)}
              />
            ))}
          </div>
        )}

        {/* 其余时辰（折叠） */}
        {restCandidates.length > 0 && verdict !== 'none' && (
          <div className="ti-rest">
            <button className="ti-toggle-rest" onClick={() => setShowAll(v => !v)}>
              {showAll ? '收起' : `展开其余 ${restCandidates.length} 个时辰`}
            </button>
            {showAll && (
              <table className="ti-rest-table">
                <thead>
                  <tr>
                    <th>时辰</th><th>概率</th><th>简评</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {restCandidates.map(c => (
                    <tr key={c.timeIndex}>
                      <td>{c.timeName}（{c.hourRange}）</td>
                      <td>{c.probability}%</td>
                      <td>{c.reasoning}</td>
                      <td>
                        <button className="ti-pick-btn-small" onClick={() => onPickTime(c.timeIndex)}>采用</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 澄清问题 */}
        {hasQuestions && (
          <div className="ti-questions">
            <div className="ti-label">
              {verdict === 'multiple'
                ? '回答以下问题以区分剩余候选'
                : '回答以下问题以补充判断依据'}
              <span className="ti-refine-progress">
                （已完成 {refineCount}/{maxRefines} 轮追问）
              </span>
            </div>
            <div className="ti-question-list">
              {questions.map(q => (
                <div key={q.id} className="ti-question">
                  <div className="ti-question-text">{q.question}</div>
                  {q.hint && <div className="ti-question-hint">{q.hint}</div>}
                  <textarea
                    className="ti-question-input"
                    rows={2}
                    value={answers[q.id] ?? ''}
                    onChange={e => answerQuestion(q, e.target.value)}
                    placeholder="请补充说明..."
                  />
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={handleRefine}>提交补充信息，重新推断</button>
          </div>
        )}

        {/* 已达最大追问轮数时显示优化策略 */}
        {showStrategies && (
          <div className="ti-strategies">
            <div className="ti-label">已完成 {maxRefines} 轮追问，仍未确定时辰</div>
            <p className="ti-strategies-summary">
              当前最佳候选概率为 <strong>{candidates[0]?.probability ?? 0}%</strong>
              {verdict === 'none' ? '，未达 ' + threshold + '% 阈值' : '，存在多个候选'}。
              为避免无限追问，请参考以下策略后<strong>返回重新输入</strong>，或直接<strong>采用概率最高的候选</strong>。
            </p>
            <div className="ti-strategies-list">
              <div className="ti-strategy-title">提升推断质量的方向</div>
              <ul>
                <li><strong>补充客观事件 + 准确年龄</strong>：例如"28岁结婚"、"32岁购房"、"35岁创业"，年龄差 1 岁内即可。</li>
                <li><strong>父母状态</strong>：父母是否健在？若已故，分别在你几岁时？</li>
                <li><strong>排行</strong>：兄弟姐妹中你排第几？哥姐还是弟妹？</li>
                <li><strong>重大健康事件</strong>：是否有过手术/重病/意外？发生时年龄？</li>
                <li><strong>事业转折</strong>：第一份正式工作年龄、首次升职年龄、是否创业及年龄。</li>
                <li><strong>居住变化</strong>：成年后第一次买房年龄、长期居住地变更。</li>
                <li><strong>避免主观词</strong>：少用"性格内向""追求自由"等模糊描述，命理无法精确对照。</li>
              </ul>
            </div>
            <p className="ti-strategies-summary">
              如果实在无法获得更多客观事实，可直接采用概率最高的候选（命盘解读时仍可参考，但请把推断盘视为参考而非定论）。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate, rank, emphasized, threshold, onPick,
}: {
  candidate: TimeCandidate;
  rank: number;
  emphasized: boolean;
  threshold: number;
  onPick: () => void;
}) {
  const passed = candidate.probability >= threshold;
  return (
    <div className={`ti-card ${emphasized ? 'ti-card--emphasized' : ''}`}>
      <div className="ti-card-head">
        <div>
          <span className="ti-card-rank">#{rank}</span>
          <span className="ti-card-time">{candidate.timeName}时</span>
          <span className="ti-card-range">{candidate.hourRange}</span>
        </div>
        <div className="ti-score">
          <span className="ti-score-num" style={{ color: passed ? '#7bba9a' : '#c87d8a' }}>
            {candidate.probability}
          </span>
          <span className="ti-score-unit">%</span>
        </div>
      </div>
      <p className="ti-card-reasoning">{candidate.reasoning}</p>
      {candidate.matchedAspects.length > 0 && (
        <div className="ti-aspects">
          <span className="ti-aspect-label match">契合：</span>
          {candidate.matchedAspects.map((a, i) => <span key={i} className="ti-tag ti-tag--match">{a}</span>)}
        </div>
      )}
      {candidate.conflictAspects.length > 0 && (
        <div className="ti-aspects">
          <span className="ti-aspect-label conflict">冲突：</span>
          {candidate.conflictAspects.map((a, i) => <span key={i} className="ti-tag ti-tag--conflict">{a}</span>)}
        </div>
      )}
      <div className="ti-card-actions">
        <button className="ti-pick-btn" onClick={onPick}>采用此时辰排盘</button>
      </div>
    </div>
  );
}
