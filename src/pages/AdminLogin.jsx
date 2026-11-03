import { useState } from 'react'
import { Scene3D } from '../components/Scene3D'
import { callAdminApi } from '../lib/adminApi'

export function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await callAdminApi(password, 'list_students')
      onSuccess(password)
    } catch {
      setError('パスワードが正しくありません。')
    }
    setLoading(false)
  }

  return (
    <div className="login-screen">
      <Scene3D />
      <div className="login-card">
        <div className="logo">
          MEDTHOD <span>SCHOOL</span>
        </div>
        <h1>監修者ログイン</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
