import { Icon3D } from './Icon3D'

const NAV = [
  { key: 'pending', label: '確認待ちのプラン', shape: 'icosahedron' },
  { key: 'generate', label: 'プラン生成', shape: 'octahedron' },
  { key: 'students', label: '生徒一覧', shape: 'dodecahedron' },
  { key: 'units', label: '単元メタ情報', shape: 'cube' },
  { key: 'materials', label: '教材', shape: 'tetrahedron' },
  { key: 'videos', label: '動画', shape: 'cylinder' },
  { key: 'questions', label: '確認問題', shape: 'cone' },
]

export function AdminShell({ current, onNavigate, onLogout, children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">
          MEDTHOD <span>SCHOOL</span>
        </div>
        <div className="sidebar-user">監修者ページ</div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              className={current === item.key ? 'active' : ''}
              onClick={() => onNavigate(item.key)}
            >
              <Icon3D shape={item.shape} size={22} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline btn-sm" onClick={onLogout}>
            ログアウト
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  )
}
