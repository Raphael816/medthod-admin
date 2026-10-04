import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

function blankForm() {
  return {
    id: null, title: '', description: '', targetUniversityId: '', subject: '', purpose: '',
    requiredSkill: '', difficulty: '', timeLimitMinutes: '', strategyNotes: '', scoringNotes: '',
    availableFrom: '', availableUntil: '',
  }
}

function editForm(s) {
  return {
    id: s.id, title: s.title, description: s.description ?? '', targetUniversityId: s.target_university_id ?? '',
    subject: s.subject ?? '', purpose: s.purpose ?? '', requiredSkill: s.required_skill ?? '',
    difficulty: s.difficulty ?? '', timeLimitMinutes: s.time_limit_minutes ?? '',
    strategyNotes: s.strategy_notes ?? '', scoringNotes: s.scoring_notes ?? '',
    availableFrom: s.available_from ? s.available_from.slice(0, 10) : '',
    availableUntil: s.available_until ? s.available_until.slice(0, 10) : '',
  }
}

const ASSIGNMENT_STATUS_LABEL = { assigned: '未着手', in_progress: '取組中', submitted: '提出済み', reviewed: '採点済み' }

export function PracticeSetsAdminPage({ password }) {
  const [sets, setSets] = useState(null)
  const [universities, setUniversities] = useState([])
  const [questions, setQuestions] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(blankForm())
  const [detail, setDetail] = useState(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(new Set())
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignDueDate, setAssignDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadList() {
    const [setRows, uniRows, questionRows, studentRows] = await Promise.all([
      callAdminApi(password, 'practice_sets_list'),
      callAdminApi(password, 'list_university_profiles'),
      callAdminApi(password, 'questions_list'),
      callAdminApi(password, 'list_students'),
    ])
    setSets(setRows)
    setUniversities(uniRows)
    setQuestions(questionRows)
    setStudents(studentRows)
  }

  useEffect(() => {
    loadList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDetail(id) {
    const data = await callAdminApi(password, 'practice_set_get', { id })
    setDetail(data)
    setSelectedQuestionIds(new Set((data.practice_set_questions ?? []).map((q) => q.question_id)))
  }

  function startEdit(s) {
    setForm(editForm(s))
    setMessage('')
    loadDetail(s.id)
  }

  function startNew() {
    setForm(blankForm())
    setDetail(null)
    setSelectedQuestionIds(new Set())
    setMessage('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) {
      setMessage('タイトルは必須です。')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const data = await callAdminApi(password, 'practice_set_upsert', {
        id: form.id ?? undefined,
        title: form.title.trim(),
        description: form.description || null,
        targetUniversityId: form.targetUniversityId || null,
        subject: form.subject || null,
        purpose: form.purpose || null,
        requiredSkill: form.requiredSkill || null,
        difficulty: form.difficulty === '' ? null : Number(form.difficulty),
        timeLimitMinutes: form.timeLimitMinutes === '' ? null : Number(form.timeLimitMinutes),
        strategyNotes: form.strategyNotes || null,
        scoringNotes: form.scoringNotes || null,
        availableFrom: form.availableFrom || null,
        availableUntil: form.availableUntil || null,
      })
      setMessage(form.id ? '更新しました。' : '登録しました。問題の選択・生徒への割当を続けてください。')
      setForm(editForm(data))
      await loadDetail(data.id)
      await loadList()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('この演習セットを削除しますか?割当・提出済みの答案も削除されます。')) return
    await callAdminApi(password, 'practice_set_delete', { id })
    if (form.id === id) startNew()
    await loadList()
  }

  async function handleTogglePublish(s) {
    await callAdminApi(password, 'practice_set_toggle_publish', { id: s.id, isPublished: !s.is_published })
    await loadList()
    if (detail?.id === s.id) await loadDetail(s.id)
  }

  function toggleQuestion(id) {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleSaveQuestions() {
    setSaving(true)
    try {
      await callAdminApi(password, 'practice_set_questions_set', {
        practiceSetId: detail.id,
        questionIds: [...selectedQuestionIds],
      })
      setMessage('問題の割当を保存しました。')
      await loadDetail(detail.id)
      await loadList()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  async function handleAssign() {
    if (!assignStudentId) return
    setSaving(true)
    try {
      await callAdminApi(password, 'practice_set_assign', {
        practiceSetId: detail.id, studentId: assignStudentId, dueDate: assignDueDate || null,
      })
      setAssignStudentId('')
      setAssignDueDate('')
      await loadDetail(detail.id)
      await loadList()
    } catch (err) {
      setMessage(err.message || '割当に失敗しました。')
    }
    setSaving(false)
  }

  async function handleUnassign(studentId) {
    if (!confirm('この生徒への割当を解除しますか?')) return
    await callAdminApi(password, 'practice_set_unassign', { practiceSetId: detail.id, studentId })
    await loadDetail(detail.id)
    await loadList()
  }

  if (sets === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>演習セット管理</h1>
        <p>志望校対策演習(完全伴走プラン)のセットを作成し、問題を割り当て、生徒に配布します。</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>{form.id ? 'セットを編集' : '新しいセットを作成'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ps-title">タイトル</label>
            <input id="ps-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="ps-desc">説明</label>
            <textarea id="ps-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ps-univ">対象大学(任意)</label>
              <select id="ps-univ" value={form.targetUniversityId} onChange={(e) => setForm({ ...form, targetUniversityId: e.target.value })}>
                <option value="">(指定なし)</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="ps-subject">科目(任意)</label>
              <input id="ps-subject" type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="ps-purpose">出題意図(任意)</label>
            <textarea id="ps-purpose" rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="ps-skill">求められる能力の定義(任意)</label>
            <textarea id="ps-skill" rows={2} value={form.requiredSkill} onChange={(e) => setForm({ ...form, requiredSkill: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ps-difficulty">難易度(1〜5・任意)</label>
              <input id="ps-difficulty" type="number" min="1" max="5" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="ps-time">制限時間(分・任意)</label>
              <input id="ps-time" type="number" min="1" value={form.timeLimitMinutes} onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="ps-strategy">解答方針・戦術のアドバイス資料(任意)</label>
            <textarea id="ps-strategy" rows={3} value={form.strategyNotes} onChange={(e) => setForm({ ...form, strategyNotes: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="ps-scoring">採点基準(任意)</label>
            <textarea id="ps-scoring" rows={2} value={form.scoringNotes} onChange={(e) => setForm({ ...form, scoringNotes: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ps-from">公開開始(任意)</label>
              <input id="ps-from" type="date" value={form.availableFrom} onChange={(e) => setForm({ ...form, availableFrom: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="ps-until">公開終了(任意)</label>
              <input id="ps-until" type="date" value={form.availableUntil} onChange={(e) => setForm({ ...form, availableUntil: e.target.value })} />
            </div>
          </div>
          {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{message}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '保存中...' : form.id ? '更新する' : '作成する'}
            </button>
            {form.id && (
              <button type="button" className="btn btn-outline" onClick={startNew}>新規作成に戻る</button>
            )}
          </div>
        </form>
      </div>

      {detail && (
        <>
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>含める問題({selectedQuestionIds.size}問選択中)</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              既存の「確認問題」から選びます。このセット専用の新しい問題は、確認問題ページで作成してから選択してください。
            </p>
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: 8 }}>
              {questions.map((q) => (
                <label key={q.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px' }}>
                  <input type="checkbox" checked={selectedQuestionIds.has(q.id)} onChange={() => toggleQuestion(q.id)} style={{ marginTop: 3 }} />
                  <span style={{ fontSize: '0.86rem' }}>
                    {q.type}{q.units && ` ・ ${q.units.subject}/${q.units.name}`} ・ {q.prompt.slice(0, 50)}{q.prompt.length > 50 ? '...' : ''}
                  </span>
                </label>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={handleSaveQuestions} disabled={saving}>
              {saving ? '保存中...' : '問題の割当を保存'}
            </button>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 12 }}>生徒への割当</h2>
            <div className="task-editor-row">
              <select value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)} style={{ flex: 1 }}>
                <option value="">生徒を選択</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input type="date" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} placeholder="期限(任意)" />
              <button className="btn btn-outline btn-sm" onClick={handleAssign} disabled={!assignStudentId || saving}>割り当てる</button>
            </div>
            {detail.assignments.length === 0 ? (
              <p className="empty-state">まだ誰にも割り当てられていません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>生徒</th><th>ステータス</th><th>期限</th><th></th></tr></thead>
                  <tbody>
                    {detail.assignments.map((a) => (
                      <tr key={a.id}>
                        <td>{a.students?.name}</td>
                        <td>{ASSIGNMENT_STATUS_LABEL[a.status] ?? a.status}</td>
                        <td>{a.due_date ?? '-'}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => handleUnassign(a.student_id)}>解除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>セット一覧</h2>
        {sets.length === 0 ? (
          <p className="empty-state">まだ演習セットがありません。</p>
        ) : (
          sets.map((s) => (
            <div className="material-row" key={s.id}>
              <div>
                <h3>{s.title}</h3>
                <p>
                  {s.university_profiles?.name ?? '大学指定なし'} ・ 問題{s.question_count}問 ・
                  割当{s.assignment_count}件(提出待ち採点{s.submitted_count}件)
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm" onClick={() => startEdit(s)}>編集</button>
                <button
                  className="btn btn-sm"
                  style={s.is_published ? undefined : { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)' }}
                  onClick={() => handleTogglePublish(s)}
                >
                  {s.is_published ? '公開中' : '非公開'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(s.id)}>削除</button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
