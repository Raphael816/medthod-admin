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

function isExpired(expiresAt) {
  return !!expiresAt && new Date(expiresAt) <= new Date()
}

function blankEnrollmentForm(programs) {
  return {
    id: null,
    programId: programs[0]?.id ?? '',
    status: 'active',
    startsAt: new Date().toISOString().slice(0, 10),
    endsAt: '',
    reason: '',
    notes: '',
  }
}

function programName(programs, id) {
  return programs.find((p) => p.id === id)?.name ?? '(不明なプログラム)'
}

function EnrollmentForm({ programs, form, onChange, onReview, onCancel }) {
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
        <label htmlFor="enr-reason">変更理由(必須・監査ログに記録されます)</label>
        <input id="enr-reason" type="text" value={form.reason} onChange={(e) => onChange({ ...form, reason: e.target.value })} />
      </div>
      <div className="form-group">
        <label htmlFor="enr-notes">内部メモ(任意)</label>
        <textarea id="enr-notes" rows={2} value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onReview} disabled={!form.reason.trim() || !form.programId}>
          変更内容を確認する
        </button>
        <button className="btn btn-outline btn-sm" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  )
}

function EnrollmentConfirm({ programs, form, onConfirm, onBack, saving }) {
  return (
    <div className="card" style={{ background: 'rgba(201,161,90,0.08)', border: '1px solid var(--gold)' }}>
      <p className="plan-goal-label" style={{ marginBottom: 10 }}>この内容で保存します</p>
      <ul style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: '0.9rem' }}>
        <li>プログラム: <strong>{programName(programs, form.programId)}</strong></li>
        <li>ステータス: <strong>{STATUS_LABEL[form.status]}</strong></li>
        <li>開始日: {form.startsAt || '未設定'} / 終了日: {form.endsAt || '未設定'}</li>
        <li>変更理由: {form.reason}</li>
        {form.notes && <li>内部メモ: {form.notes}</li>}
      </ul>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        ステータスを「有効」にする場合、既存の有効な受講プログラムは自動的に終了扱いになります。
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary btn-sm" onClick={onConfirm} disabled={saving}>
          {saving ? '保存中...' : 'この内容で保存する'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={onBack} disabled={saving}>修正する</button>
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
  const [enrollmentReview, setEnrollmentReview] = useState(false)
  const [overrideForm, setOverrideForm] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removeReason, setRemoveReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('info')

  async function loadAll() {
    const [s, p, f] = await Promise.all([
      callAdminApi(password, 'list_students'),
      callAdminApi(password, 'list_programs'),
      callAdminApi(password, 'list_features'),
    ])
    setStudents(s)
    setPrograms(p)
    setFeatures(f)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadDetail(studentId) {
    const data = await callAdminApi(password, 'student_enrollments_list', { studentId })
    setDetail(data)
  }

  function handleSelect(id) {
    setSelectedId(id)
    setEnrollmentForm(null)
    setEnrollmentReview(false)
    setOverrideForm(null)
    setRemoveTarget(null)
    setMessage('')
    if (id) loadDetail(id)
    else setDetail(null)
  }

  function showMessage(text, tone) {
    setMessage(text)
    setMessageTone(tone)
  }

  async function handleSaveEnrollment() {
    setSaving(true)
    try {
      await callAdminApi(password, 'student_enrollment_set', {
        id: enrollmentForm.id ?? undefined,
        studentId: selectedId,
        programId: enrollmentForm.programId,
        status: enrollmentForm.status,
        startsAt: enrollmentForm.startsAt || null,
        endsAt: enrollmentForm.endsAt || null,
        reason: enrollmentForm.reason,
        notes: enrollmentForm.notes || null,
      })
      setEnrollmentForm(null)
      setEnrollmentReview(false)
      await Promise.all([loadDetail(selectedId), loadAll()])
      showMessage('受講プログラムを保存しました。', 'success')
    } catch (err) {
      showMessage(err.message || '保存に失敗しました。', 'error')
    }
    setSaving(false)
  }

  async function handleSaveOverride() {
    setSaving(true)
    try {
      await callAdminApi(password, 'student_feature_override_set', {
        studentId: selectedId,
        featureId: overrideForm.featureId,
        isEnabled: overrideForm.isEnabled,
        reason: overrideForm.reason,
        expiresAt: overrideForm.expiresAt ? new Date(overrideForm.expiresAt).toISOString() : null,
      })
      setOverrideForm(null)
      await Promise.all([loadDetail(selectedId), loadAll()])
      showMessage('個別設定を保存しました。', 'success')
    } catch (err) {
      showMessage(err.message || '保存に失敗しました。', 'error')
    }
    setSaving(false)
  }

  async function handleConfirmRemoveOverride() {
    setSaving(true)
    try {
      await callAdminApi(password, 'student_feature_override_remove', {
        studentId: selectedId, featureId: removeTarget.feature_id, reason: removeReason || null,
      })
      setRemoveTarget(null)
      setRemoveReason('')
      await Promise.all([loadDetail(selectedId), loadAll()])
      showMessage('個別設定を解除しました。', 'success')
    } catch (err) {
      showMessage(err.message || '解除に失敗しました。', 'error')
    }
    setSaving(false)
  }

  if (students === null) return <p className="empty-state">読み込み中...</p>

  const selectedStudent = students.find((s) => s.id === selectedId)

  return (
    <>
      <div className="page-header">
        <h1>受講管理</h1>
        <p>生徒ごとの受講プログラム・個別機能の許可/停止・変更履歴を管理します。</p>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>氏名</th><th>志望校</th><th>現在プログラム</th><th>ステータス</th>
                <th>開始日</th><th>終了日</th><th>有効機能数</th><th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} style={selectedId === s.id ? { background: 'rgba(201,161,90,0.08)' } : undefined}>
                  <td>{s.name}</td>
                  <td>{s.target_university || '-'}</td>
                  <td>{s.current_program_name || '未設定'}</td>
                  <td>{s.current_program_status ? (STATUS_LABEL[s.current_program_status] ?? s.current_program_status) : '-'}</td>
                  <td>{s.current_program_starts_at ?? '-'}</td>
                  <td>{s.current_program_ends_at ?? '-'}</td>
                  <td>{s.enabled_feature_count}</td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => handleSelect(s.id)}>
                      {selectedId === s.id ? '選択中' : '詳細'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {message && (
        <p
          role={messageTone === 'error' ? 'alert' : 'status'}
          style={{
            fontSize: '0.85rem', marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: messageTone === 'error' ? 'rgba(179,38,30,0.08)' : 'rgba(3,120,64,0.08)',
            color: messageTone === 'error' ? '#b3261e' : '#037840',
            border: `1px solid ${messageTone === 'error' ? 'rgba(179,38,30,0.3)' : 'rgba(3,120,64,0.3)'}`,
          }}
        >
          {message}
        </p>
      )}

      {detail && selectedStudent && (
        <>
          <div className="card">
            <h2 style={{ fontSize: '1.05rem', marginBottom: 4 }}>{selectedStudent.name} さんの受講プログラム(履歴含む)</h2>
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
                {enrollmentReview ? (
                  <EnrollmentConfirm
                    programs={programs}
                    form={enrollmentForm}
                    onConfirm={handleSaveEnrollment}
                    onBack={() => setEnrollmentReview(false)}
                    saving={saving}
                  />
                ) : (
                  <EnrollmentForm
                    programs={programs}
                    form={enrollmentForm}
                    onChange={setEnrollmentForm}
                    onReview={() => setEnrollmentReview(true)}
                    onCancel={() => { setEnrollmentForm(null); setEnrollmentReview(false) }}
                  />
                )}
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
                      reason: '',
                      notes: detail.enrollments[0].notes ?? '',
                    })}
                  >
                    最新の受講プログラムを編集
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
                    {o.expires_at && (
                      <> ・期限 {new Date(o.expires_at).toLocaleDateString('ja-JP')}{isExpired(o.expires_at) && '(期限切れ・無効)'}</>
                    )}
                  </span>
                  {removeTarget?.id === o.id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="解除理由(任意)"
                        style={{ width: 160 }}
                        value={removeReason}
                        onChange={(e) => setRemoveReason(e.target.value)}
                      />
                      <button className="btn btn-primary btn-sm" onClick={handleConfirmRemoveOverride} disabled={saving}>
                        {saving ? '処理中...' : '解除する'}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => { setRemoveTarget(null); setRemoveReason('') }}>
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={() => setRemoveTarget(o)}>
                      解除
                    </button>
                  )}
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
                    <tr><th>日時</th><th>操作</th><th>理由</th><th>詳細</th></tr>
                  </thead>
                  <tbody>
                    {detail.auditLog.map((l) => (
                      <tr key={l.id}>
                        <td>{new Date(l.created_at).toLocaleString('ja-JP')}</td>
                        <td>{ACTION_LABEL[l.action] ?? l.action}</td>
                        <td style={{ fontSize: '0.82rem' }}>{l.reason ?? '-'}</td>
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
