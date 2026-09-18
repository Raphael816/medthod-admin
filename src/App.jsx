import { useState } from 'react'
import { AdminShell } from './components/AdminShell'
import { AdminLogin } from './pages/AdminLogin'
import { PendingPage } from './pages/PendingPage'
import { GeneratePage } from './pages/GeneratePage'
import { StudentsPage } from './pages/StudentsPage'
import { AdminMaterialsPage } from './pages/AdminMaterialsPage'

function App() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('admin_password'))
  const [page, setPage] = useState('pending')

  function handleLoginSuccess(pw) {
    sessionStorage.setItem('admin_password', pw)
    setPassword(pw)
  }

  function handleLogout() {
    sessionStorage.removeItem('admin_password')
    setPassword(null)
  }

  if (!password) return <AdminLogin onSuccess={handleLoginSuccess} />

  const pages = {
    pending: <PendingPage password={password} />,
    generate: <GeneratePage password={password} />,
    students: <StudentsPage password={password} />,
    materials: <AdminMaterialsPage password={password} />,
  }

  return (
    <AdminShell current={page} onNavigate={setPage} onLogout={handleLogout}>
      {pages[page]}
    </AdminShell>
  )
}

export default App
