import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

const STATUS_LABEL = {
  pending: '未開始', active: '有効', paused: '休会中', expired: '期限切れ', cancelled: '解約済み',
}
const STATUS_OPTIONS = Object.keys(STATUS_LABEL)

const ACTION_LABEL = {
  enrollment_created: '受講プログラムを追加',
  enrollment_status_changed: '受講プログラムを変更',
  override_set: '個別機能を設定',
  override_removed: '個別機能の設定を解除',
}

function blankEnrollmentForm(programs) {
  return {
    id: null,
    programId: programs[0]?.id ?? '',
    status: 'active',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: '',
    notes: '',
  }
}

function EnrollmentForm({ programs, form, onChange, onSave, onCancel, saving }) {
  return (
    <div className="card" style={{ background: 'var(--bg)' }}>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="enr-program">プログラム</label>
          <select id="enr-program" value={form.programId} onChange={(e) => onChange({ ...form, programId: e.target.value })}>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="enr-status">ステータス</label>
          <select id="enr-status" value={form.status} onChange={(e) => onChange({ ...form, status: e.target.value })}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="enr-start">開始日</label>
          <input id="enr-start" type="date" value={form.startsAt} onChange={(e) => onChange({ ...form, startsAt: e.target.value })} />
        </div>
        <div className="form-group">
          <label htmlFor="enr-end">終了日(任意)</label>
          <input id="enr-end" type="date" value={form.endsAt} onChange={(e) => onChange({ ...form, endsAt: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="enr-notes">変更理由・内部メモ</label>
        <textarea id="enr-notes" rows={2} value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}

export function StudentEnrollmentsPage({ password }) {
  const [students, setStudents] = useState(null)
  const [programs, setPrograms] = useState([])
  const [features, setFeatures] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [enrollmentForm, setEnrollmentForm] = useState(null)
  const [overrideForm, setOverrideForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    Promise.all([
      callAdminApi(password, 'list_students'),
      callAdminApi(password, 'list_programs'),
      callAdminApi(password, 'list_features'),
    ]).then(([s, p, f]) => {
      setStudents(s)
      setPrograms(p)
      setFeatures(f)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDetail(studentId) {
    const data = await callAdminApi(password, 'student_enrollments_list', { studentId })
    setDetail(data)
  }

  function handleSelect(id) {
    setSelectedId(id)
    setEnrollmentForm(null)
    setOverrideForm(null)
    setMessage('')
    if (id) loadDetail(id)
    else setDetail(null)
  }

  async function handleSaveEnrollment() {
    setSaving(true)
    setMessage('')
    try {
      await callAdminApi(password, 'student_enrollment_set', {
        id: enrollmentForm.id ?? undefined,
        studentId: selectedId,
        programId: enrollmentForm.programId,
        status: enrollmentForm.status,
        startsAt: enrollmentForm.startsAt || null,
        endsAt: enrollmentForm.endsAt || null,
        notes: enrollmentForm.notes || null,
      })
      setEnrollmentForm(null)
      await loadDetail(selectedId)
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  async function handleSaveOverride() {
    setSaving(true)
    setMessage('')
    try {
      await callAdminApi(password, 'student_feature_override_set', {
        studentId: selectedId,
        featureId: overrideForm.featureId,
        isEnabled: overrideForm.isEnabled,
        reason: overrideForm.reason || null,
        expiresAt: overrideForm.expiresAt ? new Date(overrideForm.expiresAt).toISOString() : null,
      })
      setOverrideForm(null)
      await loadDetail(selectedId)
    } catch (err) {
      setMessage(err.message || '保存に失敗しました。')
    }
    setSaving(false)
  }

  async function handleRemoveOverride(featureId) {
    if (!confirm('この個別設定を解除しますか?(プログラム標準の権限に戻ります)')) return
    try {
      await callAdminApi(password, 'student_feature_override_remove', { studentId: selectedId, featureId })
      await loadDetail(selectedId)
    } catch (err) {
      alert(err.message || '解除に失敗しました。')
    }
  }

  if (students === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>受講管理</h1>
        <p>生徒ごとの受講プログラム・個別機能の許可/停止・変更履歴を管理します。</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label htmlFor="student-select">生徒</label>
          <select id="student-select" value={selectedId} onChange={(e) => handleSelect(e.target.value)}>
            <option value="">選択してください</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}{s.current_program_name ? `(現在: ${s.current_program_name})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>{message}</p>}

      {detail && (
        <>
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', marginBottom: 12 }}>受講プログラム(履歴含む)</h2>
            {detail.enrollments.length === 0 ? (
              <p className="empty-state">受講プログラムがまだ登録されていません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>プログラム</th><th>ステータス</th><th>開始日</th><th>終了日</th><th>メモ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.enrollments.map((e) => (
                      <tr key={e.id}>
                        <td>{e.service_programs?.name}</td>
                        <td>{STATUS_LABEL[e.status] ?? e.status}</td>
                        <td>{e.starts_at ?? '-'}</td>
                        <td>{e.ends_at ?? '-'}</td>
                        <td>{e.notes ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {enrollmentForm ? (
              <div style={{ marginTop: 16 }}>
                <EnrollmentForm
                  programs={programs}
                  form={enrollmentForm}
                  onChange={setEnrollmentForm}
                  onSave={handleSaveEnrollment}
                  onCancel={() => setEnrollmentForm(null)}
                  saving={saving}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEnrollmentForm(blankEnrollmentForm(programs))}>
                  + 新しい受講プログラムを追加
                </button>
                {detail.enrollments[0] && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setEnrollmentForm({
                      id: detail.enrollments[0].id,
                      programId: detail.enrollments[0].program_id,
                      status: detail.enrollments[0].status,
                      startsAt: detail.enrollments[0].starts_at ?? '',
                      endsAt: detail.enrollments[0].ends_at ?? '',
                      notes: detail.enrollments[0].notes ?? '',
                    })}
                  >
                    最新の受講プログラムを編集(変更理由必須)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.05rem', marginBottom: 12 }}>個別機能の許可・停止</h2>
            {detail.overrides.length === 0 ? (
              <p className="empty-state">個別設定はありません(プログラム標準の権限が適用されます)。</p>
            ) : (
              detail.overrides.map((o) => (
                <div className="unit-row" key={o.id}>
                  <span>
                    {o.features?.name}: <strong>{o.is_enabled ? '許可' : '停止'}</strong>
                    {o.reason && ` (${o.reason})`}
                    {o.expires_at && ` ・期限 ${new Date(o.expires_at).toLocaleDateString('ja-JP')}`}
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => handleRemoveOverride(o.feature_id)}>
                    解除
                  </button>
                </div>
              ))
            )}
            {overrideForm ? (
              <div className="card" style={{ background: 'var(--bg)', marginTop: 12 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ov-feature">機能</label>
                    <select id="ov-feature" value={overrideForm.featureId} onChange={(e) => setOverrideForm({ ...overrideForm, featureId: e.target.value })}>
                      {features.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ov-enabled">扱い</label>
                    <select
                      id="ov-enabled"
                      value={overrideForm.isEnabled ? 'enabled' : 'disabled'}
                      onChange={(e) => setOverrideForm({ ...overrideForm, isEnabled: e.target.value === 'enabled' })}
                    >
                      <option value="enabled">個別に許可する</option>
                      <option value="disabled">個別に停止する</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="ov-reason">理由(必須)</label>
                  <input id="ov-reason" type="text" value={overrideForm.reason} onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="ov-expires">期限(任意)</label>
                  <input id="ov-expires" type="date" value={overrideForm.expiresAt} onChange={(e) => setOverrideForm({ ...overrideForm, expiresAt: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveOverride}
                    disabled={saving || !overrideForm.reason.trim()}
                  >
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setOverrideForm(null)}>キャンセル</button>
                </div>
              </div>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => setOverrideForm({ featureId: features[0]?.id ?? '', isEnabled: true, reason: '', expiresAt: '' })}
              >
                + 個別設定を追加
              </button>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.05rem', marginBottom: 12 }}>変更履歴(監査ログ)</h2>
            {detail.auditLog.length === 0 ? (
              <p className="empty-state">変更履歴はまだありません。</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>日時</th><th>操作</th><th>詳細</th></tr>
                  </thead>
                  <tbody>
                    {detail.auditLog.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleString('ja-JP')}</td>
                        <td>{ACTION_LABEL[l.action] ?? l.action}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{JSON.stringify(l.detail)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
