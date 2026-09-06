import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { IconLeaf } from '../components/icons'

export default function DoctorLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [doctorId, setDoctorId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const from = location.state?.from || '/doctor/dashboard'

  function handleSubmit(e) {
    e.preventDefault()
    const ok = login(doctorId, password)
    if (!ok) {
      setError('Incorrect Doctor ID or password.')
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="screen">
      <div className="card doctor-login-card">
        <div className="doctor-login-card__mark">
          <IconLeaf width={20} height={20} />
        </div>
        <h2 className="eyebrow-free-heading">Doctor / Staff Login</h2>
        <p className="screen-intro">Sign in to view patient reports and the clinical dashboard.</p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="doctorId">Doctor ID</label>
            <input
              id="doctorId"
              type="text"
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              placeholder="e.g. doctor"
              autoComplete="username"
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="field-error">{error}</div>}

          <button className="btn btn-primary" type="submit" style={{ width: '100%', marginTop: 4 }}>
            Sign in
          </button>
        </form>

        <div className="field-hint" style={{ marginTop: 18, textAlign: 'center' }}>
          Demo credentials: <strong>doctor / doctor123</strong>
          <br />
          This is a prototype login — not a real authentication system.
        </div>
      </div>
    </div>
  )
}
