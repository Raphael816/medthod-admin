import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

const QUESTION_TYPES = [
  '一問一答', '正誤問題', '多肢選択', '計算問題', '記述問題', 'グラフ読解', '実験考察', '英文読解', '小論文',
]
const CHOICE_TYPES = new Set(['多肢選択', '正誤問題'])

function blankForm() {
  return {
    id: null,
    unitId: '',
    type: '一問一答',
    prompt: '',
    choices: [''],
    correctAnswer: '',
    explanation: '',
    difficulty: '',
  }
}

function editForm(q) {
  return {
    id: q.id,
    unitId: q.unit_id ?? '',
    type: q.type,
    prompt: q.prompt,
    choices: q.choices && q.choices.length ? q.choices : [''],
    correctAnswer: q.correct_answer ?? '',
    explanation: q.explanation ?? '',
    difficulty: q.difficulty ?? '',
  }
}

export function QuestionsAdminPage({ password }) {
  const [questions, setQuestions] = useState(null)
  const [units, setUnits] = useState([])
  const [form, setForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const [questionRows, unitRows] = await Promise.all([
      callAdminApi(password, 'questions_list'),
      callAdminApi(password, 'list_units'),
    ])
    setQuestions(questionRows)
    setUnits(unitRows)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showChoices = CHOICE_TYPES.has(form.type)

  function updateChoice(i, value) {
    setForm((prev) => {
      const choices = [...prev.choices]
      choices[i] = value
      return { ...prev, choices }
    })
  }

  function addChoice() {
    setForm((prev) => ({ ...prev, choices: [...prev.choices, ''] }))
  }

  function removeChoice(i) {
    setForm((prev) => ({ ...prev, choices: prev.choices.filter((_, idx) => idx !== i) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.prompt.trim()) {
      setMessage('問題文は必須です。')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await callAdminApi(password, 'questions_upsert', {
        id: form.id ?? undefined,
        unitId: form.unitId || null,
        type: form.type,
        prompt: form.prompt.trim(),
        choices: showChoices ? form.choices.map((c) => c.trim()).filter(Boolean) : null,
        correctAnswer: form.correctAnswer.trim() || null,
        explanation: form.explanation.trim() || null,
        difficulty: form.difficulty === '' ? null : Number(form.difficulty),
      })
      setMessage(form.id ? '更新しました。' : '登録しました。')
      setForm(blankForm())
      await load()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('この問題を削除しますか?')) return
    await callAdminApi(password, 'questions_delete', { id })
    if (form.id === id) setForm(blankForm())
    await load()
  }

  if (questions === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>確認問題</h1>
        <p>単元ごとの確認問題を登録します。</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>{form.id ? '問題を編集' : '新しい問題を登録'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="q-unit">紐付ける単元(任意)</label>
              <select id="q-unit" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                <option value="">(単元なし)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.subject} / {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="q-type">形式</label>
              <select id="q-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {QUESTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="q-prompt">問題文</label>
            <textarea id="q-prompt" rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} />
          </div>

          {showChoices && (
            <div className="form-group">
              <label>選択肢</label>
              {form.choices.map((c, i) => (
                <div className="task-editor-row" key={i}>
                  <input type="text" style={{ flex: 1 }} value={c} onChange={(e) => updateChoice(i, e.target.value)} />
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => removeChoice(i)}>
                    削除
                  </button>
                </div>
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={addChoice}>
                + 選択肢を追加
              </button>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="q-answer">正答(任意・記述系は採点基準の目安として)</label>
            <textarea
              id="q-answer"
              rows={2}
              value={form.correctAnswer}
              onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="q-explanation">解説(任意)</label>
            <textarea
              id="q-explanation"
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="q-difficulty">難易度(1〜5・任意)</label>
            <input
              id="q-difficulty"
              type="number"
              min="1"
              max="5"
              style={{ width: 100 }}
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            />
          </div>

          {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{message}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '保存中...' : form.id ? '更新する' : '登録する'}
            </button>
            {form.id && (
              <button type="button" className="btn btn-outline" onClick={() => setForm(blankForm())}>
                新規登録に戻る
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>問題一覧</h2>
        {questions.length === 0 ? (
          <p className="empty-state">まだ問題がありません。</p>
        ) : (
          questions.map((q) => (
            <div className="material-row" key={q.id}>
              <div>
                <h3>{q.prompt.length > 60 ? `${q.prompt.slice(0, 60)}...` : q.prompt}</h3>
                <p>
                  {q.type}
                  {q.units && ` ・ ${q.units.subject} / ${q.units.name}`}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setForm(editForm(q))}>
                  編集
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(q.id)}>
                  削除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
