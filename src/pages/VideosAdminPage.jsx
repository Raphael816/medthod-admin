import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

function blankChapter() {
  return { key: crypto.randomUUID(), title: '', startSeconds: '' }
}

function blankForm() {
  return {
    id: null,
    title: '',
    description: '',
    unitId: '',
    instructorName: '',
    durationSeconds: '',
    difficulty: '',
    isRequired: false,
    videoUrl: '',
    chapters: [],
  }
}

function editForm(v) {
  return {
    id: v.id,
    title: v.title,
    description: v.description ?? '',
    unitId: v.unit_id ?? '',
    instructorName: v.instructor_name ?? '',
    durationSeconds: v.duration_seconds ?? '',
    difficulty: v.difficulty ?? '',
    isRequired: v.is_required ?? false,
    videoUrl: v.video_url,
    chapters: (v.video_chapters ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ key: c.id, title: c.title, startSeconds: c.start_seconds })),
  }
}

export function VideosAdminPage({ password }) {
  const [videos, setVideos] = useState(null)
  const [units, setUnits] = useState([])
  const [form, setForm] = useState(blankForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    const [videoRows, unitRows] = await Promise.all([
      callAdminApi(password, 'videos_list'),
      callAdminApi(password, 'list_units'),
    ])
    setVideos(videoRows)
    setUnits(unitRows)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateChapter(i, chapter) {
    setForm((prev) => {
      const chapters = [...prev.chapters]
      chapters[i] = chapter
      return { ...prev, chapters }
    })
  }

  function addChapter() {
    setForm((prev) => ({ ...prev, chapters: [...prev.chapters, blankChapter()] }))
  }

  function removeChapter(i) {
    setForm((prev) => ({ ...prev, chapters: prev.chapters.filter((_, idx) => idx !== i) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.videoUrl) {
      setMessage('タイトルと動画URLは必須です。')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await callAdminApi(password, 'videos_upsert', {
        id: form.id ?? undefined,
        title: form.title,
        description: form.description || null,
        unitId: form.unitId || null,
        instructorName: form.instructorName || null,
        durationSeconds: form.durationSeconds === '' ? 0 : Number(form.durationSeconds),
        difficulty: form.difficulty === '' ? null : Number(form.difficulty),
        isRequired: form.isRequired,
        videoUrl: form.videoUrl,
        chapters: form.chapters
          .filter((c) => c.title.trim())
          .map((c) => ({ title: c.title.trim(), startSeconds: Number(c.startSeconds) || 0 })),
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
    if (!confirm('この動画を削除しますか?')) return
    await callAdminApi(password, 'videos_delete', { id })
    if (form.id === id) setForm(blankForm())
    await load()
  }

  if (videos === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>動画</h1>
        <p>解説動画とチャプターを登録します。</p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>{form.id ? '動画を編集' : '新しい動画を登録'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="v-title">タイトル</label>
            <input id="v-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="v-desc">説明(任意)</label>
            <textarea id="v-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="v-url">動画URL</label>
            <input id="v-url" type="text" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="v-unit">紐付ける単元(任意)</label>
              <select id="v-unit" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                <option value="">(単元なし)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.subject} / {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="v-instructor">講師名(任意)</label>
              <input
                id="v-instructor"
                type="text"
                value={form.instructorName}
                onChange={(e) => setForm({ ...form, instructorName: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="v-duration">再生時間(秒)</label>
              <input
                id="v-duration"
                type="number"
                min="0"
                value={form.durationSeconds}
                onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="v-difficulty">難易度(1〜5・任意)</label>
              <input
                id="v-difficulty"
                type="number"
                min="1"
                max="5"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} />
              必須動画にする
            </label>
          </div>

          <div className="form-group">
            <label>チャプター</label>
            {form.chapters.map((c, i) => (
              <div className="task-editor-row" key={c.key}>
                <input
                  type="text"
                  placeholder="チャプター名"
                  style={{ flex: 1 }}
                  value={c.title}
                  onChange={(e) => updateChapter(i, { ...c, title: e.target.value })}
                />
                <input
                  type="number"
                  min="0"
                  placeholder="開始(秒)"
                  style={{ width: 100 }}
                  value={c.startSeconds}
                  onChange={(e) => updateChapter(i, { ...c, startSeconds: e.target.value })}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => removeChapter(i)}>
                  削除
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addChapter}>
              + チャプターを追加
            </button>
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
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>動画一覧</h2>
        {videos.length === 0 ? (
          <p className="empty-state">まだ動画がありません。</p>
        ) : (
          videos.map((v) => (
            <div className="material-row" key={v.id}>
              <div>
                <h3>{v.title}</h3>
                <p>
                  {v.units && `${v.units.subject} / ${v.units.name} ・ `}
                  {v.video_chapters?.length ?? 0}チャプター
                  {v.is_required && ' ・ 必須'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setForm(editForm(v))}>
                  編集
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleDelete(v.id)}>
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
