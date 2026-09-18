import { useEffect, useRef, useState } from 'react'
import { Tilt } from '../components/Tilt'
import { callAdminApi, fileToBase64 } from '../lib/adminApi'

export function AdminMaterialsPage({ password }) {
  const [materials, setMaterials] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const fileRef = useRef(null)

  async function load() {
    const data = await callAdminApi(password, 'materials_list')
    setMaterials(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!title || !file) {
      setMessage('タイトルとファイルは必須です。')
      return
    }
    setUploading(true)
    setMessage('')
    try {
      const fileBase64 = await fileToBase64(file)
      await callAdminApi(password, 'materials_upload', {
        title,
        description: description || null,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        fileBase64,
      })
      setMessage(`「${title}」をアップロードしました。下の一覧から公開設定できます。`)
      setTitle('')
      setDescription('')
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
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="description">説明(任意)</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
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
          materials.map((m) => (
            <Tilt className="material-row" key={m.id}>
              <div>
                <h3>{m.title}</h3>
                {m.description && <p>{m.description}</p>}
                <p>{m.file_name}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
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
          ))
        )}
      </div>
    </>
  )
}
