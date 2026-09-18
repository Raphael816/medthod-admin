import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

const STATUS_LABEL = { confirmed: '確定済み', draft: '確認待ち' }

function StudentUnitsPanel({ password, studentId }) {
  const [rows, setRows] = useState(null)
  const [busyUnitId, setBusyUnitId] = useState(null)

  async function load() {
    const data = await callAdminApi(password, 'student_units_list', { studentId })
    setRows(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  if (rows === null) return <p className="empty-state">読み込み中...</p>

  const subjects = [...new Set(rows.map((r) => r.unit.subject))]

  async function toggleRequired(row) {
    setBusyUnitId(row.unit.id)
    try {
      await callAdminApi(password, 'student_unit_assign', {
        studentId,
        unitId: row.unit.id,
        isRequired: !row.is_instructor_assigned,
      })
      await load()
    } catch {
      alert('更新に失敗しました。')
    }
    setBusyUnitId(null)
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
        「必須指定」にすると、その生徒の単元一覧に講師指定として表示され、生徒側からの登録解除ができなくなります。
      </p>
      {subjects.map((subject) => (
        <div key={subject} style={{ marginBottom: 12 }}>
          <h3 className="unit-subject" style={{ margin: '12px 0 6px', fontSize: '0.95rem' }}>
            {subject}
          </h3>
          {rows
            .filter((r) => r.unit.subject === subject)
            .map((r) => (
              <div className="unit-row" key={r.unit.id}>
                <span>
                  {r.unit.name}
                  {r.is_registered && (
                    <span className="status-pill" style={{ marginLeft: 8 }}>
                      登録中・{r.status}
                    </span>
                  )}
                </span>
                <button
                  className="btn btn-sm"
                  style={
                    r.is_instructor_assigned
                      ? undefined
                      : { background: 'transparent', color: 'var(--navy)', border: '1.5px solid var(--navy)' }
                  }
                  onClick={() => toggleRequired(r)}
                  disabled={busyUnitId === r.unit.id}
                >
                  {r.is_instructor_assigned ? '必須指定中' : '必須指定にする'}
                </button>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}

export function StudentsPage({ password }) {
  const [students, setStudents] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    callAdminApi(password, 'list_students').then(setStudents)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (students === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>生徒一覧</h1>
      </div>
      <div className="card">
        {students.length === 0 ? (
          <p className="empty-state">生徒が登録されていません。</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>氏名</th>
                  <th>志望校</th>
                  <th>直近の演習記録</th>
                  <th>最新プラン</th>
                  <th>単元管理</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.target_university || '-'}</td>
                    <td>{s.latest_week ? `第${s.latest_week}週` : 'なし'}</td>
                    <td>
                      {s.latest_plan_week
                        ? `第${s.latest_plan_week}週 (${STATUS_LABEL[s.latest_plan_status]})`
                        : 'なし'}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      >
                        {expandedId === s.id ? '閉じる' : '単元を管理'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {expandedId && (
        <div className="card">
          <h2 style={{ fontSize: '1.05rem', marginBottom: 4 }}>
            {students.find((s) => s.id === expandedId)?.name} さんの単元管理
          </h2>
          <StudentUnitsPanel password={password} studentId={expandedId} />
        </div>
      )}
    </>
  )
}
