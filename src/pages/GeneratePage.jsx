import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

export function GeneratePage({ password }) {
  const [students, setStudents] = useState(null)
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    callAdminApi(password, 'list_students').then(setStudents)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (students === null) return <p className="empty-state">読み込み中...</p>

  const selected = students.find((s) => s.id === selectedId)

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await callAdminApi(password, 'generate_plan', {
        studentId: selected.id,
        weekNumber: selected.latest_week,
      })
      setResult(data)
    } catch (err) {
      setError(err.message || '生成に失敗しました。')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="page-header">
        <h1>プラン生成</h1>
      </div>
      <div className="card">
        <div className="form-group">
          <label htmlFor="student">生徒</label>
          <select id="student" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            <option value="">選択してください</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {selected && !selected.latest_week && <p className="empty-state">この生徒の演習記録がまだありません。</p>}

        {selected && selected.latest_week && (
          <>
            <p style={{ marginBottom: 16 }}>直近の演習記録: 第{selected.latest_week}週</p>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading
                ? 'AIが生成中...'
                : `第${selected.latest_week}週の結果から第${selected.latest_week + 1}週のプランをAI生成する`}
            </button>
          </>
        )}

        {error && <p className="error-text" style={{ marginTop: 12 }}>{error}</p>}

        {result && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
              下書きを生成しました。「確認待ちのプラン」ページで内容を確認・確定してください。
            </p>
            <div className="plan-goal">
              <span className="plan-goal-label">今週の目標(案)</span>
              {result.goal_text}
            </div>
            <div className="plan-goal" style={{ marginTop: 12 }}>
              <span className="plan-goal-label">計画変更の理由(案)</span>
              {result.change_reason}
            </div>
            <ul style={{ margin: '12px 0 0', paddingLeft: 20 }}>
              {result.tasks.map((t) => (
                <li key={t.id} style={{ marginBottom: 6 }}>
                  {t.description}
                  {t.estimated_hours != null && ` (約${t.estimated_hours}時間)`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
