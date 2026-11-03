import { useEffect, useState } from 'react'
import { Tilt } from '../components/Tilt'
import { callAdminApi } from '../lib/adminApi'

function blankTask() {
  return { key: crypto.randomUUID(), description: '', estimatedHours: '', unitId: '' }
}

function TaskEditor({ task, units, onChange, onRemove }) {
  return (
    <div className="task-editor-row">
      <select
        value={task.unitId}
        onChange={(e) => onChange({ ...task, unitId: e.target.value })}
      >
        <option value="">(単元なし)</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.subject} / {u.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="やること"
        value={task.description}
        onChange={(e) => onChange({ ...task, description: e.target.value })}
        style={{ flex: 1 }}
      />
      <input
        type="number"
        min="0"
        step="0.5"
        placeholder="時間"
        style={{ width: 64 }}
        value={task.estimatedHours}
        onChange={(e) => onChange({ ...task, estimatedHours: e.target.value })}
      />
      <button type="button" className="btn btn-outline btn-sm" onClick={onRemove}>
        削除
      </button>
    </div>
  )
}

export function PendingPage({ password }) {
  const [drafts, setDrafts] = useState(null)
  const [units, setUnits] = useState([])
  const [edits, setEdits] = useState({})
  const [busyId, setBusyId] = useState(null)

  async function load() {
    const [data, unitRows] = await Promise.all([
      callAdminApi(password, 'list_pending'),
      callAdminApi(password, 'list_units'),
    ])
    setDrafts(data)
    setUnits(unitRows)
    const initialEdits = {}
    for (const d of data) {
      initialEdits[d.id] = {
        goalText: d.goal_text ?? '',
        changeReason: d.change_reason ?? '',
        tasks: (d.tasks ?? []).map((t) => ({
          key: t.id,
          description: t.description,
          estimatedHours: t.estimated_hours ?? '',
          unitId: t.unit_id ?? '',
        })),
      }
    }
    setEdits(initialEdits)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateGoal(id, goalText) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], goalText } }))
  }

  function updateReason(id, changeReason) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], changeReason } }))
  }

  function updateTask(id, index, task) {
    setEdits((prev) => {
      const tasks = [...prev[id].tasks]
      tasks[index] = task
      return { ...prev, [id]: { ...prev[id], tasks } }
    })
  }

  function addTask(id) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], tasks: [...prev[id].tasks, blankTask()] } }))
  }

  function removeTask(id, index) {
    setEdits((prev) => {
      const tasks = prev[id].tasks.filter((_, i) => i !== index)
      return { ...prev, [id]: { ...prev[id], tasks } }
    })
  }

  async function handleConfirm(id) {
    setBusyId(id)
    try {
      const { goalText, changeReason, tasks } = edits[id]
      await callAdminApi(password, 'confirm_plan', {
        planId: id,
        goalText,
        changeReason,
        tasks: tasks
          .filter((t) => t.description.trim())
          .map((t, i) => ({
            description: t.description.trim(),
            estimatedHours: t.estimatedHours === '' ? null : Number(t.estimatedHours),
            unitId: t.unitId || null,
            sortOrder: i,
          })),
      })
      await load()
    } catch (err) {
      alert(err.message || '確定に失敗しました。')
    }
    setBusyId(null)
  }

  if (drafts === null) return <p className="empty-state">読み込み中...</p>

  return (
    <>
      <div className="page-header">
        <h1>確認待ちのプラン</h1>
      </div>
      {drafts.length === 0 ? (
        <div className="card empty-state">確認待ちのプランはありません。</div>
      ) : (
        drafts.map((d) => (
          <Tilt className="card" key={d.id}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>
              {d.students?.name ?? '(不明な生徒)'} さん — 第{d.week_number}週
            </h2>
            {d.students?.target_university && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                志望校: {d.students.target_university}
              </p>
            )}
            <div className="form-group">
              <label>今週の目標</label>
              <input
                type="text"
                value={edits[d.id]?.goalText ?? ''}
                onChange={(e) => updateGoal(d.id, e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor={`reason-${d.id}`}>先週からの計画変更理由（生徒に公開）</label>
              <textarea
                id={`reason-${d.id}`}
                rows={3}
                value={edits[d.id]?.changeReason ?? ''}
                onChange={(e) => updateReason(d.id, e.target.value)}
                required
              />
              <small>演習結果に裏付けのない変化・志望校の出題断定がないか確認してください。</small>
            </div>
            <div className="form-group">
              <label>タスク(単元 / やること / 目安時間)</label>
              {(edits[d.id]?.tasks ?? []).map((task, i) => (
                <TaskEditor
                  key={task.key}
                  task={task}
                  units={units}
                  onChange={(t) => updateTask(d.id, i, t)}
                  onRemove={() => removeTask(d.id, i)}
                />
              ))}
              <button type="button" className="btn btn-outline btn-sm" onClick={() => addTask(d.id)}>
                + タスクを追加
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => handleConfirm(d.id)}
              disabled={busyId === d.id}
            >
              {busyId === d.id ? '確定中...' : 'この内容で確定して公開する'}
            </button>
          </Tilt>
        ))
      )}
    </>
  )
}
