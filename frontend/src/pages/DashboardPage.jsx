import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap, User, LogOut,
  Newspaper, TrendingUp, TrendingDown, Sparkles, Smile,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getDashboard } from '../services/dashboardApi'
import { getPreferences } from '../services/onboardingApi'
import VoteButtons from '../components/VoteButtons'
import { getVotes } from '../services/feedbackApi'

// All four section keys in default display order.
const ALL_SECTIONS = ['news', 'prices', 'ai_insight', 'meme']

const SECTION_LABELS = {
  news: 'Market News',
  prices: 'Coin Prices',
  ai_insight: 'AI Insight',
  meme: 'Crypto Meme',
}

const SECTION_ICONS = {
  news:       { Icon: Newspaper,  cls: 'icon-news'   },
  prices:     { Icon: TrendingUp, cls: 'icon-prices' },
  ai_insight: { Icon: Sparkles,   cls: 'icon-ai'     },
  meme:       { Icon: Smile,      cls: 'icon-meme'   },
}

// Maps frontend section key → data_sources field name in the API response.
const SOURCE_KEY = {
  news:       'market_news',
  prices:     'coin_prices',
  ai_insight: 'ai_insight',
  meme:       'meme',
}

// Maps frontend section key → backend section_type value used in feedback.
const SECTION_TYPE = {
  news:       'market_news',
  prices:     'coin_prices',
  ai_insight: 'ai_insight',
  meme:       'meme',
}

// Returns the content_item_id to use when submitting or matching a vote.
// Meme uses the actual meme id (e.g. "meme-006"); all other sections use section_type.
function getContentItemId(sectionKey, dashboard) {
  if (sectionKey === 'meme') return dashboard?.meme?.id ?? SECTION_TYPE[sectionKey]
  return SECTION_TYPE[sectionKey]
}

// Returns all four section keys: selected content types first (preserving their
// saved order), then the remaining sections in default order.
function orderedSections(contentTypes) {
  const selected = contentTypes.filter((t) => ALL_SECTIONS.includes(t))
  const rest = ALL_SECTIONS.filter((t) => !selected.includes(t))
  return [...selected, ...rest]
}

// ─── Section sub-components ───────────────────────────────────────────────────

function MarketNews({ articles }) {
  return (
    <ul className="news-list">
      {articles.map((a) => (
        <li key={a.id} className="news-item">
          {a.url !== '#' ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer">
              {a.title}
              <ArrowUpRight
                size={11}
                style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 3, opacity: 0.55 }}
              />
            </a>
          ) : (
            <span className="news-title-plain">{a.title}</span>
          )}
          <p className="news-summary">{a.summary}</p>
          <p className="news-meta">
            {a.source} · {new Date(a.published_at).toLocaleDateString()}
          </p>
        </li>
      ))}
    </ul>
  )
}

function CoinPrices({ prices }) {
  return (
    <table className="prices-table">
      <thead>
        <tr>
          <th>Coin</th>
          <th>Price (USD)</th>
          <th>24h</th>
        </tr>
      </thead>
      <tbody>
        {prices.map((c) => (
          <tr key={c.symbol}>
            <td>
              <div className="coin-name">
                <span className="coin-symbol-badge">{c.symbol.slice(0, 3)}</span>
                <span className="coin-symbol">{c.symbol}</span>
              </div>
            </td>
            <td>
              ${c.price_usd.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}
            </td>
            <td>
              {c.change_24h >= 0 ? (
                <span className="price-positive">
                  <TrendingUp size={12} />+{c.change_24h.toFixed(2)}%
                </span>
              ) : (
                <span className="price-negative">
                  <TrendingDown size={12} />{c.change_24h.toFixed(2)}%
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AiInsight({ text }) {
  return (
    <div className="ai-block">
      <div className="ai-quote-bar" />
      <p className="ai-text">{text}</p>
    </div>
  )
}

function CryptoMeme({ meme }) {
  return (
    <div className="meme-wrap">
      <img src={meme.image_url} alt={meme.caption} className="meme-img" />
      <p className="meme-caption">{meme.caption}</p>
    </div>
  )
}

// ─── Live dot for "live" badge ────────────────────────────────────────────────
function LiveDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: 'currentColor',
      }}
    />
  )
}

// ─── Generic section card ─────────────────────────────────────────────────────

function SectionCard({ sectionKey, dashboard, votes, index }) {
  const sourceLabel = dashboard.data_sources?.[SOURCE_KEY[sectionKey]]
  const isLive = sourceLabel === 'live'
  const { Icon, cls } = SECTION_ICONS[sectionKey]
  const sectionType = SECTION_TYPE[sectionKey]
  const contentItemId = getContentItemId(sectionKey, dashboard)
  const voteEntry = votes?.[sectionType]
  // Only restore the saved vote when content_item_id matches the current item.
  const initialVote = voteEntry?.content_item_id === contentItemId ? voteEntry.vote : null

  let body = null
  if (sectionKey === 'news')       body = <MarketNews articles={dashboard.market_news ?? []} />
  else if (sectionKey === 'prices')     body = <CoinPrices prices={dashboard.coin_prices ?? []} />
  else if (sectionKey === 'ai_insight') body = <AiInsight text={dashboard.ai_insight} />
  else if (sectionKey === 'meme')       body = <CryptoMeme meme={dashboard.meme} />

  return (
    <motion.div
      className="section-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.33, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
    >
      <div className="section-card-header">
        <div className={`section-card-icon ${cls}`}>
          <Icon size={17} />
        </div>
        <span className="section-card-title">{SECTION_LABELS[sectionKey]}</span>
        {sourceLabel && (
          <span className={`badge ${isLive ? 'badge-live' : 'badge-fallback'}`}>
            {isLive && <LiveDot />}
            {sourceLabel}
          </span>
        )}
      </div>

      {body}

      <VoteButtons
        dailyContentId={dashboard.daily_content_id}
        sectionType={sectionType}
        contentItemId={contentItemId}
        initialVote={initialVote}
      />
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [sections, setSections] = useState(ALL_SECTIONS)
  const [votes, setVotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      try {
        const [dashData, prefData] = await Promise.all([
          getDashboard(),
          getPreferences().catch(() => ({ content_types: [] })),
        ])
        setDashboard(dashData)
        setSections(orderedSections(prefData.content_types ?? []))
        // Fetch saved votes for this daily snapshot; non-fatal if it fails.
        const votesData = await getVotes(dashData.daily_content_id).catch(() => ({ votes: {} }))
        setVotes(votesData.votes)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleLogout() { logout(); navigate('/login') }

  if (loading) {
    return (
      <div className="page-loading">
        <span className="spinner" />
        Loading your dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-loading" style={{ flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--red)', fontSize: '0.9rem' }}>
          Failed to load dashboard: {error}
        </p>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Logout
        </button>
      </div>
    )
  }

  return (
    <motion.div
      className="dashboard-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      {/* Sticky header */}
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <div className="dashboard-logo-icon">
            <Zap size={17} color="#fff" strokeWidth={2.5} />
          </div>
          <span className="dashboard-logo-text">CryptoAdvisor</span>
        </div>

        <div className="dashboard-header-right">
          <div className="user-badge">
            <User size={12} />
            <strong>{user?.name}</strong>
            <span>·</span>
            <span>{dashboard?.investor_type?.replace(/_/g, ' ')}</span>
          </div>
          <motion.button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <LogOut size={13} /> Logout
          </motion.button>
        </div>
      </header>

      {/* Main content */}
      <div className="dashboard-content">
        <div className="dashboard-meta">
          <h1 className="dashboard-title">Your Daily Dashboard</h1>
          <span className="dashboard-date">{dashboard?.date}</span>
        </div>

        {sections.map((key, i) => (
          <SectionCard
            key={key}
            sectionKey={key}
            dashboard={dashboard}
            votes={votes}
            index={i}
          />
        ))}

        <p className="disclaimer">
          <strong>Disclaimer:</strong> This is not financial advice. All content is for informational
          purposes only. Always do your own research before making any investment decisions.
        </p>
      </div>
    </motion.div>
  )
}
