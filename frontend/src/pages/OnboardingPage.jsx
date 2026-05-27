import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Newspaper, TrendingUp, Sparkles, Smile, LogOut, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getPreferences, savePreferences } from '../services/onboardingApi'

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT']

const INVESTOR_TYPES = [
  { value: 'beginner',      label: 'Beginner'      },
  { value: 'hodler',        label: 'HODLer'        },
  { value: 'day_trader',    label: 'Day Trader'    },
  { value: 'nft_collector', label: 'NFT Collector' },
  { value: 'researcher',    label: 'Researcher'    },
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

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.26, ease: 'easeOut' },
  }),
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
      </div>
    )
  }

  return (
    <motion.div
      className="onboarding-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      {/* Top bar */}
      <div className="onboarding-topbar">
        <div className="onboarding-logo">
          <div className="onboarding-logo-icon">
            <TrendingUp size={12} />
          </div>
          <span className="onboarding-logo-text">CryptoAdvisor</span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          <LogOut size={12} /> Logout
        </button>
      </div>

      <div className="onboarding-body">
        <div className="onboarding-heading">
          <h1 className="onboarding-title">Welcome, {user?.name}!</h1>
          <p className="onboarding-subtitle">
            Answer three quick questions to personalise your dashboard.
          </p>
        </div>

        <form className="onboarding-form" onSubmit={handleSubmit}>
          {/* Assets */}
          <motion.div
            className="onboarding-section"
            custom={0}
            variants={sectionVariants}
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
                  onClick={() => setAssets((prev) => toggle(prev, a))}
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
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="onboarding-section-title">What type of investor are you?</p>
            <div className="chip-grid">
              {INVESTOR_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`chip${investorType === value ? ' selected' : ''}`}
                  onClick={() => setInvestorType(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content priorities */}
          <motion.div
            className="onboarding-section"
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <p className="onboarding-section-title">What content should we prioritise?</p>
            <div className="content-grid">
              {CONTENT_TYPES.map(({ value, label, Icon }) => (
                <div
                  key={value}
                  className={`content-card${contentTypes.includes(value) ? ' selected' : ''}`}
                  onClick={() => setContentTypes((prev) => toggle(prev, value))}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setContentTypes(toggle(contentTypes, value))}
                >
                  <div className="content-icon"><Icon size={18} /></div>
                  <div className="content-label">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {error && (
            <motion.div
              className="alert-error"
              style={{ marginBottom: 14 }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ marginTop: 6 }}
            whileTap={{ scale: submitting ? 1 : 0.98 }}
          >
            {submitting
              ? <><span className="spinner" style={{ width: 14, height: 14 }} />Saving…</>
              : <>Save and go to Dashboard <ArrowRight size={14} /></>}
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}
