import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Terminal, User, LogOut,
  Newspaper, TrendingUp, TrendingDown, Bot, Smile,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getDashboard } from '../services/dashboardApi'
import { getPreferences } from '../services/onboardingApi'
import VoteButtons from '../components/VoteButtons'
import { getVotes } from '../services/feedbackApi'

const ALL_SECTIONS = ['news', 'prices', 'ai_insight', 'meme']

const SECTION_LABELS = {
  news:       'Market News',
  prices:     'Coin Prices',
  ai_insight: 'Analyst Brief',
  meme:       'Market Meme',
}

const SECTION_ICONS = {
  news:       { Icon: Newspaper,  cls: 'icon-news'   },
  prices:     { Icon: TrendingUp, cls: 'icon-prices' },
  ai_insight: { Icon: Bot,        cls: 'icon-ai'     },
  meme:       { Icon: Smile,      cls: 'icon-meme'   },
}

const SOURCE_KEY = {
  news:       'market_news',
  prices:     'coin_prices',
  ai_insight: 'ai_insight',
  meme:       'meme',
}

const SECTION_TYPE = {
  news:       'market_news',
  prices:     'coin_prices',
  ai_insight: 'ai_insight',
  meme:       'meme',
}

function getContentItemId(sectionKey, dashboard) {
  if (sectionKey === 'meme') return dashboard?.meme?.id ?? SECTION_TYPE[sectionKey]
  return SECTION_TYPE[sectionKey]
}

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
          <div className="news-body">
            {a.url !== '#' ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                {a.title}
                <ArrowUpRight
                  size={10}
                  style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 3, opacity: 0.45 }}
                />
              </a>
            ) : (
              <span className="news-title-plain">{a.title}</span>
            )}
            <p className="news-meta">{a.source}</p>
          </div>
          {a.published_at && (
            <span className="news-time">
              {new Date(a.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
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
          <th>Asset</th>
          <th>Price (USD)</th>
          <th>24h Chg</th>
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
              <span className="price-value">
                ${c.price_usd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}
              </span>
            </td>
            <td>
              {c.change_24h >= 0 ? (
                <span className="price-positive">
                  <TrendingUp size={11} />+{c.change_24h.toFixed(2)}%
                </span>
              ) : (
                <span className="price-negative">
                  <TrendingDown size={11} />{c.change_24h.toFixed(2)}%
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
      <span className="analyst-tag">AI-generated analysis</span>
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
  const initialVote = voteEntry?.content_item_id === contentItemId ? voteEntry.vote : null

  let body = null
  if (sectionKey === 'news')            body = <MarketNews articles={dashboard.market_news ?? []} />
  else if (sectionKey === 'prices')     body = <CoinPrices prices={dashboard.coin_prices ?? []} />
  else if (sectionKey === 'ai_insight') body = <AiInsight text={dashboard.ai_insight} />
  else if (sectionKey === 'meme')       body = <CryptoMeme meme={dashboard.meme} />

  return (
    <motion.div
      className={`section-card${sectionKey === 'meme' ? ' section-card--muted' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.26, ease: 'easeOut' }}
    >
      <div className="section-card-header">
        <div className={`section-card-icon ${cls}`}>
          <Icon size={14} />
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
  const [prefs, setPrefs] = useState(null)
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
          getPreferences().catch(() => ({ content_types: [], interested_assets: [] })),
        ])
        setDashboard(dashData)
        setPrefs(prefData)
        setSections(orderedSections(prefData.content_types ?? []))
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
        <p style={{ color: 'var(--red)', fontSize: '0.88rem' }}>
          Failed to load dashboard: {error}
        </p>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
      </div>
    )
  }

  return (
    <motion.div
      className="dashboard-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
    >
      <header className="dashboard-header">
        <div className="dashboard-logo">
          <div className="dashboard-logo-icon">
            <Terminal size={13} />
          </div>
          <span className="dashboard-logo-text">CryptoAdvisor</span>
        </div>

        <div className="dashboard-header-right">
          <div className="user-badge">
            <User size={11} />
            <strong>{user?.name}</strong>
            {prefs?.investor_type && (
              <>
                <span style={{ color: 'var(--text-3)' }}>·</span>
                <span>{prefs.investor_type.replace(/_/g, ' ')}</span>
              </>
            )}
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

      <div className="dashboard-content">
        <div className="dashboard-meta">
          <div className="dashboard-meta-top">
            <h1 className="dashboard-title">Market Intelligence</h1>
            <span className="dashboard-date">{dashboard?.date}</span>
          </div>
          {prefs?.interested_assets?.length > 0 && (
            <div className="tracking-bar">
              <span className="tracking-label">Watching</span>
              {prefs.interested_assets.map((a) => (
                <span key={a} className="tracking-tag">{a}</span>
              ))}
            </div>
          )}
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
