import { useEffect, useRef, useState } from 'react'
import { Tilt } from '../components/Tilt'
import { callAdminApi, fileToBase64 } from '../lib/adminApi'

function blankForm() {
  return { title: '', description: '', unitId: '', isRequired: false, difficulty: '', purpose: '', goal: '' }
}

function editForm(m) {
  return {
    title: m.title,
    description: m.description ?? '',
    unitId: m.unit_id ?? '',
    isRequired: m.is_required ?? false,
    difficulty: m.difficulty ?? '',
    purpose: m.purpose ?? '',
    goal: m.goal ?? '',
  }
}

function MetaFields({ form, onChange, units }) {
  return (
    <>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="unit">紐付ける単元(任意)</label>
          <select id="unit" value={form.unitId} onChange={(e) => onChange({ ...form, unitId: e.target.value })}>
            <option value="">(単元なし)</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.subject} / {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="difficulty">難易度(1〜5・任意)</label>
          <input
            id="difficulty"
            type="number"
            min="1"
            max="5"
            value={form.difficulty}
            onChange={(e) => onChange({ ...form, difficulty: e.target.value })}
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="purpose">学習目的(任意)</label>
        <input id="purpose" type="text" value={form.purpose} onChange={(e) => onChange({ ...form, purpose: e.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor="goal">到達目標(任意)</label>
        <input id="goal" type="text" value={form.goal} onChange={(e) => onChange({ ...form, goal: e.target.value })} />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.isRequired}
            onChange={(e) => onChange({ ...form, isRequired: e.target.checked })}
          />
          必須教材にする
        </label>
      </div>
    </>
  )
}

export function AdminMaterialsPage({ password }) {
  const [materials, setMaterials] = useState(null)
  const [units, setUnits] = useState([])
  const [form, setForm] = useState(blankForm())
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editState, setEditState] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const fileRef = useRef(null)

  async function load() {
    const [materialRows, unitRows] = await Promise.all([
      callAdminApi(password, 'materials_list'),
      callAdminApi(password, 'list_units'),
    ])
    setMaterials(materialRows)
    setUnits(unitRows)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!form.title || !file) {
      setMessage('タイトルとファイルは必須です。')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const fileBase64 = await fileToBase64(file)
      await callAdminApi(password, 'materials_upload', {
        title: form.title,
        description: form.description || null,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileBase64,
        unitId: form.unitId || null,
        isRequired: form.isRequired,
        difficulty: form.difficulty === '' ? null : Number(form.difficulty),
        purpose: form.purpose || null,
        goal: form.goal || null,
      })
      setMessage(`「${form.title}」をアップロードしました。下の一覧から公開設定できます。`)
      setForm(blankForm())
      fileRef.current.value = ''
      await load()
    } catch (err) {
      setMessage(err.message || 'アップロードに失敗しました。')
    }
    setUploading(false)
  }

  async function handleToggle(m) {
    await callAdminApi(password, 'materials_toggle', { id: m.id, isPublished: !m.is_published })
    await load()
  }

  async function handleDelete(m) {
    await callAdminApi(password, 'materials_delete', { id: m.id, storagePath: m.storage_path })
    await load()
  }

  function startEdit(m) {
    setEditingId(m.id)
    setEditState(editForm(m))
  }

  async function handleSaveEdit(id) {
    setSavingEdit(true)
    try {
      await callAdminApi(password, 'materials_update', {
        id,
        title: editState.title,
        description: editState.description || null,
        unitId: editState.unitId || null,
        isRequired: editState.isRequired,
        difficulty: editState.difficulty === '' ? null : Number(editState.difficulty),
        purpose: editState.purpose || null,
        goal: editState.goal || null,
      })
      setEditingId(null)
      await load()
    } catch {
      alert('更新に失敗しました。')
    }
    setSavingEdit(false)
  }

  return (
    <>
      <div className="page-header">
        <h1>教材</h1>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>新しい教材をアップロード</h2>
        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label htmlFor="title">タイトル</label>
            <input id="title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="description">説明(任意)</label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <MetaFields form={form} onChange={setForm} units={units} />
          <div className="form-group">
            <label htmlFor="file">ファイル</label>
            <input id="file" type="file" ref={fileRef} />
          </div>
          {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{message}</p>}
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            {uploading ? 'アップロード中...' : 'アップロード'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>教材一覧</h2>
        {materials === null ? (
          <p className="empty-state">読み込み中...</p>
        ) : materials.length === 0 ? (
          <p className="empty-state">まだ教材がありません。</p>
        ) : (
          materials.map((m) =>
            editingId === m.id ? (
              <div className="card" key={m.id} style={{ background: 'var(--bg)' }}>
                <div className="form-group">
                  <label htmlFor={`edit-title-${m.id}`}>タイトル</label>
                  <input
                    id={`edit-title-${m.id}`}
                    type="text"
                    value={editState.title}
                    onChange={(e) => setEditState({ ...editState, title: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`edit-desc-${m.id}`}>説明</label>
                  <textarea
                    id={`edit-desc-${m.id}`}
                    rows={2}
                    value={editState.description}
                    onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                  />
                </div>
                <MetaFields form={editState} onChange={setEditState} units={units} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(m.id)} disabled={savingEdit}>
                    {savingEdit ? '保存中...' : '保存'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <Tilt className="material-row" key={m.id}>
                <div>
                  <h3>{m.title}</h3>
                  {m.description && <p>{m.description}</p>}
                  <p>
                    {m.file_name}
                    {m.units && ` ・ ${m.units.subject} / ${m.units.name}`}
                    {m.is_required && ' ・ 必須'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(m)}>
                    編集
                  </button>
                  <button
                    className="btn btn-sm"
                    style={m.is_published ? undefined : { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)' }}
                    onClick={() => handleToggle(m)}
                  >
                    {m.is_published ? '公開中' : '非公開'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(m)}>
                    削除
                  </button>
                </div>
              </Tilt>
            ),
          )
        )}
      </div>
    </>
  )
}
