import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

function blankJobForm() {
  return { id: null, title: '', employmentType: '', summary: '', description: '', requirements: '', sortOrder: 0 }
}

function editJobForm(j) {
  return {
    id: j.id, title: j.title, employmentType: j.employment_type ?? '', summary: j.summary ?? '',
    description: j.description ?? '', requirements: j.requirements ?? '', sortOrder: j.sort_order ?? 0,
  }
}

const APPLICATION_STATUS_LABEL = { new: '新規', contacted: '連絡済み', rejected: '不採用', hired: '採用' }

export function SiteAdminPage({ password }) {
  const [pages, setPages] = useState(null)
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [jobForm, setJobForm] = useState(blankJobForm())
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function load() {
    try {
      const [pageRows, jobRows, applicationRows] = await Promise.all([
        callAdminApi(password, 'site_pages_list'),
        callAdminApi(password, 'job_postings_list'),
        callAdminApi(password, 'job_applications_list'),
      ])
      setPages(pageRows)
      setJobs(jobRows)
      setApplications(applicationRows)
    } catch (err) {
      setMessage(err.message || '読み込みに失敗しました。')
      setPages([])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleToggleVisibility(page) {
    try {
      await callAdminApi(password, 'site_page_set_visibility', { id: page.id, isVisible: !page.is_visible })
      await load()
    } catch (err) {
      setMessage(err.message || '更新に失敗しました。')
    }
  }

  function startEditJob(j) {
    setJobForm(editJobForm(j))
    setMessage('')
  }

  function startNewJob() {
    setJobForm(blankJobForm())
    setMessage('')
  }

  async function handleJobSubmit(e) {
    e.preventDefault()
    if (!jobForm.title.trim()) {
      setMessage('タイトルは必須です。')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      await callAdminApi(password, 'job_posting_upsert', {
        id: jobForm.id ?? undefined,
        title: jobForm.title.trim(),
        employmentType: jobForm.employmentType || null,
        summary: jobForm.summary || null,
        description: jobForm.description || null,
        requirements: jobForm.requirements || null,
        sortOrder: Number(jobForm.sortOrder) || 0,
      })
      setMessage(jobForm.id ? '更新しました。' : '登録しました。')
      startNewJob()
      await load()
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  async function handleJobDelete(id) {
    if (!confirm('この求人を削除しますか?')) return
    await callAdminApi(password, 'job_posting_delete', { id })
    if (jobForm.id === id) startNewJob()
    await load()
  }

  async function handleJobTogglePublish(j) {
    await callAdminApi(password, 'job_posting_toggle_publish', { id: j.id, isPublished: !j.is_published })
    await load()
  }

  async function handleApplicationStatus(a, status) {
    await callAdminApi(password, 'job_application_update_status', { id: a.id, status })
    await load()
  }

  if (pages === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>HP管理</h1>
        <p>公開サイト(HP)のページ表示・非表示と、採用募集・応募状況を管理します。切り替えは即座にサイトへ反映されます。</p>
      </div>
      {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>}

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>ページの表示・非表示</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
          非表示にしたページは、ナビゲーションから消え、直接アクセスしても「準備中」の案内が表示されます。トップページ・無料相談・法的ページは対象外です。
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>ページ</th><th>パス</th><th>状態</th><th></th></tr></thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id}>
                  <td>{p.label}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.path}</td>
                  <td>{p.is_visible ? '表示中' : '非表示'}</td>
                  <td>
                    <button
                      className="btn btn-sm"
                      style={p.is_visible ? undefined : { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)' }}
                      onClick={() => handleToggleVisibility(p)}
                    >
                      {p.is_visible ? '非表示にする' : '表示する'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>{jobForm.id ? '求人を編集' : '新しい求人を作成'}</h2>
        <form onSubmit={handleJobSubmit}>
          <div className="form-group">
            <label htmlFor="job-title">タイトル</label>
            <input id="job-title" type="text" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="job-type">雇用形態(任意)</label>
              <input id="job-type" type="text" placeholder="例: 業務委託" value={jobForm.employmentType} onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="job-sort">表示順</label>
              <input id="job-sort" type="number" value={jobForm.sortOrder} onChange={(e) => setJobForm({ ...jobForm, sortOrder: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="job-summary">概要(一覧に表示・任意)</label>
            <textarea id="job-summary" rows={2} value={jobForm.summary} onChange={(e) => setJobForm({ ...jobForm, summary: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="job-desc">仕事内容(任意)</label>
            <textarea id="job-desc" rows={4} value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label htmlFor="job-req">応募要件(任意)</label>
            <textarea id="job-req" rows={3} value={jobForm.requirements} onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })} />
          </div>
          {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>{message}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '保存中...' : jobForm.id ? '更新する' : '作成する'}
            </button>
            {jobForm.id && (
              <button type="button" className="btn btn-outline" onClick={startNewJob}>新規作成に戻る</button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>求人一覧</h2>
        {jobs.length === 0 ? (
          <p className="empty-state">まだ求人がありません。</p>
        ) : (
          jobs.map((j) => (
            <div className="material-row" key={j.id}>
              <div>
                <h3>{j.title}</h3>
                <p>
                  {j.employment_type ?? '雇用形態未設定'} ・ 応募{j.application_count}件
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn btn-outline btn-sm" onClick={() => startEditJob(j)}>編集</button>
                <button
                  className="btn btn-sm"
                  style={j.is_published ? undefined : { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)' }}
                  onClick={() => handleJobTogglePublish(j)}
                >
                  {j.is_published ? '公開中' : '非公開'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleJobDelete(j.id)}>削除</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', marginBottom: 16 }}>応募一覧</h2>
        {applications.length === 0 ? (
          <p className="empty-state">まだ応募はありません。</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>氏名</th><th>連絡先</th><th>応募求人</th><th>メッセージ</th><th>状態</th></tr></thead>
              <tbody>
                {applications.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.email}{a.phone && ` / ${a.phone}`}</td>
                    <td>{a.job_postings?.title ?? '-'}</td>
                    <td style={{ maxWidth: 320, whiteSpace: 'pre-line' }}>{a.message || '-'}</td>
                    <td>
                      <select value={a.status} onChange={(e) => handleApplicationStatus(a, e.target.value)}>
                        {Object.entries(APPLICATION_STATUS_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
