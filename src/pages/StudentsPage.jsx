import { useEffect, useState } from 'react'
import { callAdminApi } from '../lib/adminApi'

const STATUS_LABEL = { confirmed: '確定済み', draft: '確認待ち' }

export function StudentsPage({ password }) {
  const [students, setStudents] = useState(null)

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
