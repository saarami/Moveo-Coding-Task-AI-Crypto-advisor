import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, AlertCircle, LogIn } from 'lucide-react'
import { login, getMe } from '../services/authApi'
import { getPreferences } from '../services/onboardingApi'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { storeLogin } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const { access_token } = await login(email, password)
      localStorage.setItem('token', access_token)
      const userData = await getMe()
      storeLogin(access_token, userData)
      // Route returning users based on whether they have completed onboarding.
      try { await getPreferences(); navigate('/dashboard') }
      catch { navigate('/onboarding') }
    } catch (err) {
      localStorage.removeItem('token')
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, ease: 'easeOut' }}
      >
        <div className="auth-logo">
          <Zap size={24} color="#fff" strokeWidth={2.5} />
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your crypto dashboard</p>

        {error && (
          <div className="alert-error">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <div className="field-inner">
              <span className="field-icon"><Mail size={14} /></span>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="field-inner">
              <span className="field-icon"><Lock size={14} /></span>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            whileHover={{ scale: submitting ? 1 : 1.01 }}
            whileTap={{ scale: submitting ? 1 : 0.98 }}
          >
            {submitting
              ? <><span className="spinner" style={{ width: 15, height: 15 }} />Signing in…</>
              : <><LogIn size={15} />Sign In</>}
          </motion.button>
        </form>

        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/signup">Create one</Link>
        </p>
      </motion.div>
    </div>
  )
}
