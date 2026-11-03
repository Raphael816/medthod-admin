import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

function toEditState(program) {
  return {
    name: program.name,
    description: program.description ?? '',
    isActive: program.is_active,
    acceptsEnrollment: program.accepts_enrollment,
    showOnSite: program.show_on_site,
    sortOrder: program.sort_order,
    featureIds: new Set((program.program_features ?? []).map((pf) => pf.feature_id)),
  }
}

export function ProgramsAdminPage({ password }) {
  const [programs, setPrograms] = useState(null)
  const [features, setFeatures] = useState([])
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [message, setMessage] = useState('')

  async function load() {
    const [programRows, featureRows] = await Promise.all([
      callAdminApi(password, 'list_programs'),
      callAdminApi(password, 'list_features'),
    ])
    setPrograms(programRows)
    setFeatures(featureRows)
    const initial = {}
    for (const p of programRows) initial[p.id] = toEditState(p)
    setEdits(initial)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (programs === null) return <p className="empty-state">読み込み中...</p>

  function updateField(id, field, value) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  function toggleFeature(id, featureId) {
    setEdits((prev) => {
      const featureIds = new Set(prev[id].featureIds)
      if (featureIds.has(featureId)) featureIds.delete(featureId)
      else featureIds.add(featureId)
      return { ...prev, [id]: { ...prev[id], featureIds } }
    })
  }

  async function handleSave(id) {
    setSavingId(id)
    setMessage('')
    try {
      const e = edits[id]
      await callAdminApi(password, 'program_update', {
        id,
        name: e.name.trim(),
        description: e.description.trim() || null,
        isActive: e.isActive,
        acceptsEnrollment: e.acceptsEnrollment,
        showOnSite: e.showOnSite,
        sortOrder: Number(e.sortOrder) || 0,
        featureIds: [...e.featureIds],
      })
      setMessage('保存しました。')
      await load()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSavingId(null)
  }

  return (
    <>
      <div className="page-header">
        <h1>プログラム管理</h1>
        <p>
          3段階プログラム(ベーシック/プレミアム/完全伴走)の説明文・公開設定・含まれる機能を管理します。
          価格はここでは扱いません(<code>docs/program-and-pricing-proposal.md</code>の承認後に別途反映します)。
        </p>
      </div>
      {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>}
      {programs.map((p) => (
        <div className="card" key={p.id}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>
            {p.name} <span className="status-pill" style={{ marginLeft: 8 }}>{p.code}</span>
          </h2>
          <div className="form-group">
            <label htmlFor={`name-${p.id}`}>表示名</label>
            <input
              id={`name-${p.id}`}
              type="text"
              value={edits[p.id]?.name ?? ''}
              onChange={(e) => updateField(p.id, 'name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor={`desc-${p.id}`}>説明</label>
            <textarea
              id={`desc-${p.id}`}
              rows={2}
              value={edits[p.id]?.description ?? ''}
              onChange={(e) => updateField(p.id, 'description', e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`sort-${p.id}`}>表示順</label>
              <input
                id={`sort-${p.id}`}
                type="number"
                value={edits[p.id]?.sortOrder ?? 0}
                onChange={(e) => updateField(p.id, 'sortOrder', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={edits[p.id]?.isActive ?? false}
                  onChange={(e) => updateField(p.id, 'isActive', e.target.checked)}
                />
                有効
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={edits[p.id]?.acceptsEnrollment ?? false}
                  onChange={(e) => updateField(p.id, 'acceptsEnrollment', e.target.checked)}
                />
                新規受付可
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={edits[p.id]?.showOnSite ?? false}
                  onChange={(e) => updateField(p.id, 'showOnSite', e.target.checked)}
                />
                公開ページへ表示
              </label>
            </div>
          </div>
          <div className="form-group">
            <label>含まれる機能</label>
            <div className="unit-meta-row">
              {features.map((f) => {
                const checked = edits[p.id]?.featureIds?.has(f.id) ?? false
                return (
                  <label
                    key={f.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                      border: '1px solid var(--border)', borderRadius: 999,
                      background: checked ? 'rgba(201,161,90,0.14)' : 'transparent',
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleFeature(p.id, f.id)} />
                    {f.name}
                  </label>
                )
              })}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => handleSave(p.id)} disabled={savingId === p.id}>
            {savingId === p.id ? '保存中...' : '保存'}
          </button>
        </div>
      ))}
    </>
  )
}
