import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Terminal, User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  function handleLogout() { logout(); navigate('/login') }

  return (
    <header className="app-header">
      <div className="header-logo" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
        <div className="header-logo-icon">
          <Terminal size={13} />
        </div>
        <span className="header-logo-text">CryptoAdvisor</span>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-btn${pathname === '/dashboard' ? ' nav-btn--active' : ''}`}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`nav-btn${pathname === '/preferences' ? ' nav-btn--active' : ''}`}
          onClick={() => navigate('/preferences')}
        >
          Preferences
        </button>
      </nav>

      <div className="header-right">
        <div className="user-badge">
          <User size={11} />
          <strong>{user?.name}</strong>
        </div>
        <motion.button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          whileTap={{ scale: 0.95 }}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <LogOut size={12} /> Logout
        </motion.button>
      </div>
    </header>
  )
}
