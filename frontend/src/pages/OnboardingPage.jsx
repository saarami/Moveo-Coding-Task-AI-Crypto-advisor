import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function OnboardingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <h1>Onboarding</h1>
      <p>Welcome, {user?.name}! Set your preferences below.</p>
      <p>Preference quiz coming in Phase 11.</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}
