import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Newspaper, TrendingUp, Sparkles, Smile, LogOut, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPreferences, savePreferences } from '../services/onboardingApi'

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC']

const INVESTOR_TYPES = [
  { value: 'beginner',      label: 'Beginner',      icon: '🌱' },
  { value: 'hodler',        label: 'HODLer',        icon: '💎' },
  { value: 'day_trader',    label: 'Day Trader',    icon: '📈' },
  { value: 'nft_collector', label: 'NFT Collector', icon: '🎨' },
  { value: 'researcher',    label: 'Researcher',    icon: '🔬' },
]

const CONTENT_TYPES = [
  { value: 'news',       label: 'Market News', Icon: Newspaper  },
  { value: 'prices',     label: 'Coin Prices', Icon: TrendingUp },
  { value: 'ai_insight', label: 'AI Insight',  Icon: Sparkles   },
  { value: 'meme',       label: 'Crypto Meme', Icon: Smile      },
]

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.32, ease: 'easeOut' } }),
}

export default function OnboardingPage() {
  const [checking, setChecking] = useState(true)
  const [assets, setAssets] = useState([])
  const [investorType, setInvestorType] = useState('')
  const [contentTypes, setContentTypes] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // If the user already completed onboarding, skip straight to the dashboard.
  useEffect(() => {
    getPreferences()
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setChecking(false))
  }, [navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (assets.length === 0) return setError('Select at least one asset.')
    if (!investorType) return setError('Select your investor type.')
    if (contentTypes.length === 0) return setError('Select at least one content type.')
    setError('')
    setSubmitting(true)
    try {
      await savePreferences(assets, investorType, contentTypes)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleLogout() { logout(); navigate('/login') }

  if (checking) {
    return (
      <div className="page-loading">
        <span className="spinner" />
        Loading…
      </div>
    )
  }

  return (
    <motion.div
      className="onboarding-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="onboarding-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="onboarding-title">Welcome, {user?.name}!</h1>
            <p className="onboarding-subtitle">
              Answer three quick questions to personalise your dashboard.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit}>
        {/* Assets */}
        <motion.div
          className="onboarding-section"
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="onboarding-section-title">Which assets are you interested in?</p>
          <div className="chip-grid">
            {ASSETS.map((a) => (
              <button
                key={a}
                type="button"
                className={`chip${assets.includes(a) ? ' selected' : ''}`}
                onClick={() => setAssets(toggle(assets, a))}
              >
                {a}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Investor type */}
        <motion.div
          className="onboarding-section"
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="onboarding-section-title">What type of investor are you?</p>
          <div className="investor-grid">
            {INVESTOR_TYPES.map(({ value, label, icon }) => (
              <div
                key={value}
                className={`investor-card${investorType === value ? ' selected' : ''}`}
                onClick={() => setInvestorType(value)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setInvestorType(value)}
              >
                <div className="investor-icon">{icon}</div>
                <div className="investor-label">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Content priorities */}
        <motion.div
          className="onboarding-section"
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <p className="onboarding-section-title">What content should we prioritize for you?</p>
          <div className="content-grid">
            {CONTENT_TYPES.map(({ value, label, Icon }) => (
              <div
                key={value}
                className={`content-card${contentTypes.includes(value) ? ' selected' : ''}`}
                onClick={() => setContentTypes(toggle(contentTypes, value))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setContentTypes(toggle(contentTypes, value))}
              >
                <div className="content-icon"><Icon size={20} /></div>
                <div className="content-label">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {error && (
          <motion.div
            className="alert-error"
            style={{ marginBottom: 14 }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </motion.div>
        )}

        <motion.button
          type="submit"
          className="btn btn-primary"
          disabled={submitting}
          style={{ marginTop: 6 }}
          whileHover={{ scale: submitting ? 1 : 1.01 }}
          whileTap={{ scale: submitting ? 1 : 0.98 }}
        >
          {submitting
            ? <><span className="spinner" style={{ width: 15, height: 15 }} />Saving…</>
            : <>Save and go to Dashboard <ArrowRight size={15} /></>}
        </motion.button>
      </form>
    </motion.div>
  )
}
