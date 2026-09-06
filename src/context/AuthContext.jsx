import { createContext, useContext, useState, useCallback } from 'react'

// Mock doctor authentication. This project had no auth system at all
// before this feature, so there was nothing existing to plug into —
// this is a minimal, clearly-labelled stand-in, in the same spirit as
// the mock ABHA field on the Consent screen.
//
// LATER: replace login()/logout() with real calls to a backend auth
// service (issuing a real signed session/JWT, checked server-side on
// every request), and remove DEMO_DOCTORS entirely. Keeping the same
// useAuth() interface means the screens that call it won't need to
// change when that swap happens.

const SESSION_KEY = 'mhs_doctor_session_v1'

const DEMO_DOCTORS = [
  { doctorId: 'doctor', password: 'doctor123', name: 'Dr. Anitha Raman', role: 'General Physician' },
  { doctorId: 'ayush.doctor', password: 'ayush123', name: 'Dr. Karthik Iyer', role: 'AYUSH Physician' },
]

const AuthContext = createContext(null)

function readSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(() => readSession())

  const login = useCallback((doctorId, password) => {
    const match = DEMO_DOCTORS.find(
      (d) => d.doctorId.toLowerCase() === (doctorId || '').trim().toLowerCase() && d.password === password
    )
    if (!match) return false

    const session = { doctorId: match.doctorId, name: match.name, role: match.role, loggedInAt: new Date().toISOString() }
    setDoctor(session)
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      /* session still works in-memory for this tab */
    }
    return true
  }, [])

  const logout = useCallback(() => {
    setDoctor(null)
    try {
      window.sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  return <AuthContext.Provider value={{ doctor, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
