import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

function blankEdit(u) {
  return {
    description: u.description ?? '',
    difficulty: u.difficulty ?? '',
    standardHours: u.standard_hours ?? '',
  }
}

export function UnitsAdminPage({ password }) {
  const [units, setUnits] = useState(null)
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState('')

  async function load() {
    const data = await callAdminApi(password, 'list_units')
    setUnits(data)
    const initial = {}
    for (const u of data) initial[u.id] = blankEdit(u)
    setEdits(initial)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (units === null) return <p className="empty-state">読み込み中...</p>

  function updateField(id, field, value) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function handleSave(id) {
    setSavingId(id)
    setMessage('')
    try {
      const e = edits[id]
      await callAdminApi(password, 'units_update', {
        id,
        description: e.description.trim() || null,
        difficulty: e.difficulty === '' ? null : Number(e.difficulty),
        standardHours: e.standardHours === '' ? null : Number(e.standardHours),
      })
      setMessage('保存しました。')
      await load()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSavingId(null)
  }

  const subjects = [...new Set(units.map((u) => u.subject))]

  return (
    <>
      <div className="page-header">
        <h1>単元メタ情報</h1>
        <p>各単元の説明・難易度・標準学習時間を編集します。生徒画面の単元詳細・優先度提案に反映されます。</p>
      </div>
      {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>}
      {subjects.map((subject) => (
        <div className="card" key={subject}>
          <h2 className="unit-subject" style={{ marginTop: 0 }}>
            {subject}
          </h2>
          {units
            .filter((u) => u.subject === subject)
            .map((u) => (
              <div key={u.id} style={{ borderBottom: '1px solid var(--border)', padding: '14px 0' }}>
                <h3 style={{ fontSize: '0.98rem', marginBottom: 10 }}>{u.name}</h3>
                <div className="form-group">
                  <label htmlFor={`desc-${u.id}`}>説明</label>
                  <textarea
                    id={`desc-${u.id}`}
                    rows={2}
                    value={edits[u.id]?.description ?? ''}
                    onChange={(e) => updateField(u.id, 'description', e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor={`diff-${u.id}`}>難易度(1〜5)</label>
                    <input
                      id={`diff-${u.id}`}
                      type="number"
                      min="1"
                      max="5"
                      value={edits[u.id]?.difficulty ?? ''}
                      onChange={(e) => updateField(u.id, 'difficulty', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`hours-${u.id}`}>標準学習時間(時間)</label>
                    <input
                      id={`hours-${u.id}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={edits[u.id]?.standardHours ?? ''}
                      onChange={(e) => updateField(u.id, 'standardHours', e.target.value)}
                    />
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => handleSave(u.id)} disabled={savingId === u.id}>
                  {savingId === u.id ? '保存中...' : '保存'}
                </button>
              </div>
            ))}
        </div>
      ))}
    </>
  )
}
