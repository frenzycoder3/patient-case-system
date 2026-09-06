import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { doctor } = useAuth()
  if (!doctor) return <Navigate to="/doctor/login" replace />
  return children
}
