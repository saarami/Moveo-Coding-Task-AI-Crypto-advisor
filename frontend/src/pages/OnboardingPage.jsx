import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPreferences, savePreferences } from '../services/onboardingApi'

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC']

const INVESTOR_TYPES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'hodler', label: 'HODLer' },
  { value: 'day_trader', label: 'Day Trader' },
  { value: 'nft_collector', label: 'NFT Collector' },
  { value: 'researcher', label: 'Researcher' },
]

const CONTENT_TYPES = [
  { value: 'news', label: 'Market News' },
  { value: 'prices', label: 'Coin Prices' },
  { value: 'ai_insight', label: 'AI Insight' },
  { value: 'meme', label: 'Crypto Meme' },
]

function toggle(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (checking) return <p>Loading…</p>

  return (
    <div>
      <h1>Welcome, {user?.name}!</h1>
      <p>Answer three quick questions to personalise your crypto dashboard.</p>

      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Which assets are you interested in?</legend>
          {ASSETS.map((a) => (
            <label key={a} style={{ marginRight: 14 }}>
              <input
                type="checkbox"
                checked={assets.includes(a)}
                onChange={() => setAssets(toggle(assets, a))}
              />{' '}
              {a}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>What type of investor are you?</legend>
          {INVESTOR_TYPES.map(({ value, label }) => (
            <label key={value} style={{ marginRight: 14 }}>
              <input
                type="radio"
                name="investorType"
                value={value}
                checked={investorType === value}
                onChange={() => setInvestorType(value)}
              />{' '}
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>What content would you like to see?</legend>
          {CONTENT_TYPES.map(({ value, label }) => (
            <label key={value} style={{ marginRight: 14 }}>
              <input
                type="checkbox"
                checked={contentTypes.includes(value)}
                onChange={() => setContentTypes(toggle(contentTypes, value))}
              />{' '}
              {label}
            </label>
          ))}
        </fieldset>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save and go to Dashboard'}
          </button>
        </div>
      </form>

      <button onClick={handleLogout} style={{ marginTop: 16 }}>
        Logout
      </button>
    </div>
  )
}
