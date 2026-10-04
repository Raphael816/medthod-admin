import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

function blankFeedbackForm(existing) {
  if (existing) {
    return {
      id: existing.id, score: existing.score ?? '', feedback: existing.feedback ?? '',
      deductionReasons: existing.deduction_reasons ?? '', improvedAnswer: existing.improved_answer ?? '',
      isPublished: existing.is_published, scheduleReviewFlag: false,
    }
  }
  return { id: null, score: '', feedback: '', deductionReasons: '', improvedAnswer: '', isPublished: false, scheduleReviewFlag: false }
}

function SubmissionGrading({ password, submission, onSaved }) {
  const existing = (submission.answer_feedback ?? [])[0] ?? null
  const [form, setForm] = useState(blankFeedbackForm(existing))
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(publish) {
    setSaving(true)
    setMessage('')
    try {
      await callAdminApi(password, 'answer_feedback_upsert', {
        id: form.id ?? undefined,
        submissionId: submission.id,
        score: form.score === '' ? null : Number(form.score),
        feedback: form.feedback || null,
        deductionReasons: form.deductionReasons || null,
        improvedAnswer: form.improvedAnswer || null,
        isPublished: publish,
        scheduleReviewFlag: form.scheduleReviewFlag,
      })
      setMessage(publish ? '保存して公開しました。' : '下書きとして保存しました。')
      onSaved()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  const q = submission.questions

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '16px 0' }}>
      <p style={{ fontWeight: 700, marginBottom: 4 }}>{q?.type} ・ {q?.prompt}</p>
      {q?.correct_answer && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>参考正答: {q.correct_answer}</p>}
      <div className="card" style={{ background: 'var(--bg)', margin: '10px 0' }}>
        <p className="plan-goal-label">生徒の解答</p>
        <p style={{ whiteSpace: 'pre-line' }}>{submission.answer_text || '(未記入)'}</p>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={`score-${submission.id}`}>得点(任意)</label>
          <input id={`score-${submission.id}`} type="number" step="0.5" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={`feedback-${submission.id}`}>添削コメント</label>
        <textarea id={`feedback-${submission.id}`} rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor={`deduction-${submission.id}`}>減点理由(任意)</label>
        <textarea id={`deduction-${submission.id}`} rows={2} value={form.deductionReasons} onChange={(e) => setForm({ ...form, deductionReasons: e.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor={`improved-${submission.id}`}>改善答案例(任意)</label>
        <textarea id={`improved-${submission.id}`} rows={2} value={form.improvedAnswer} onChange={(e) => setForm({ ...form, improvedAnswer: e.target.value })} />
      </div>
      {q?.unit_id && (
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.scheduleReviewFlag} onChange={(e) => setForm({ ...form, scheduleReviewFlag: e.target.checked })} />
            この問題を復習予定に追加する
          </label>
        </div>
      )}
      {message && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>{message}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-outline btn-sm" onClick={() => handleSave(false)} disabled={saving}>下書き保存</button>
        <button className="btn btn-primary btn-sm" onClick={() => handleSave(true)} disabled={saving}>
          {saving ? '保存中...' : '保存して生徒に公開する'}
        </button>
      </div>
      {existing?.is_published && <p style={{ fontSize: '0.78rem', color: '#037840', marginTop: 6 }}>現在、生徒に公開中です。</p>}
    </div>
  )
}

export function GradingPage({ password }) {
  const [attempts, setAttempts] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [message, setMessage] = useState('')

  async function load() {
    const data = await callAdminApi(password, 'list_attempts_for_review')
    setAttempts(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleMarkGraded(attemptId) {
    try {
      await callAdminApi(password, 'practice_set_attempt_mark_graded', { attemptId })
      setMessage('採点完了にしました。')
      await load()
    } catch (err) {
      setMessage(err.message || '処理に失敗しました。')
    }
  }

  if (attempts === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>採点</h1>
        <p>生徒が提出した志望校対策演習の答案を採点・添削します。公開するまで生徒には見えません。</p>
      </div>
      {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>}

      {attempts.length === 0 ? (
        <div className="card empty-state">採点待ちの提出はまだありません。</div>
      ) : (
        attempts.map((a) => (
          <div className="card" key={a.id}>
            <div className="section-title-row">
              <h2 style={{ fontSize: '1.05rem' }}>
                {a.students?.name} さん ・ {a.practice_sets?.title}
                <span className="status-pill" style={{ marginLeft: 10 }}>
                  {a.status === 'graded' ? '採点済み' : '提出済み(未採点)'}
                </span>
              </h2>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
              >
                {expandedId === a.id ? '閉じる' : '採点する'}
              </button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              提出日時: {a.submitted_at ? new Date(a.submitted_at).toLocaleString('ja-JP') : '-'}
              {a.time_spent_seconds != null && ` ・ 所要時間 約${Math.round(a.time_spent_seconds / 60)}分`}
            </p>
            {expandedId === a.id && (
              <>
                {(a.answer_submissions ?? []).map((s) => (
                  <SubmissionGrading key={s.id} password={password} submission={s} onSaved={load} />
                ))}
                {a.status !== 'graded' && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => handleMarkGraded(a.id)}>
                    すべての採点を完了にする
                  </button>
                )}
              </>
            )}
          </div>
        ))
      )}
    </>
  )
}
