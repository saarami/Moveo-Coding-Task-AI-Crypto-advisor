import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Newspaper, TrendingUp, TrendingDown, Bot, Smile,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import { getDashboard } from '../services/dashboardApi'
import { getPreferences } from '../services/onboardingApi'
import VoteButtons from '../components/VoteButtons'
import { getVotes } from '../services/feedbackApi'

const ALL_SECTIONS = ['news', 'prices', 'ai_insight', 'meme']

const SECTION_LABELS = {
  news:       'Market News',
  prices:     'Coin Prices',
  ai_insight: 'Analyst Brief',
  meme:       'Market Humor',
}

const SECTION_ICONS = {
  news:       { Icon: Newspaper,  cls: 'icon-news'   },
  prices:     { Icon: TrendingUp, cls: 'icon-prices' },
  ai_insight: { Icon: Bot,        cls: 'icon-ai'     },
  meme:       { Icon: Smile,      cls: 'icon-meme'   },
}

const SECTION_TYPE = {
  news:       'market_news',
  prices:     'coin_prices',
  ai_insight: 'ai_insight',
  meme:       'meme',
}

function getContentItemId(sectionKey, dashboard) {
  return dashboard?.section_content_ids?.[SECTION_TYPE[sectionKey]] ?? SECTION_TYPE[sectionKey]
}

function buildContentSnapshot(sectionKey, dashboard, prefs) {
  if (sectionKey === 'meme') {
    const m = dashboard?.meme
    return m ? { id: m.id, caption: m.caption, image_url: m.image_url } : null
  }
  if (sectionKey === 'ai_insight') {
    return {
      text: dashboard?.ai_insight ?? '',
      assets: dashboard?.interested_assets ?? [],
      investor_type: prefs?.investor_type ?? '',
      source: 'ai',
    }
  }
  if (sectionKey === 'news') return { items: dashboard?.market_news ?? [] }
  if (sectionKey === 'prices') return { prices: dashboard?.coin_prices ?? [] }
  return null
}

function orderedSections(contentTypes) {
  const selected = contentTypes.filter((t) => ALL_SECTIONS.includes(t))
  const rest = ALL_SECTIONS.filter((t) => !selected.includes(t))
  return [...selected, ...rest]
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatSourceLabel(src) {
  if (src === 'live') return 'live'
  if (src === 'static_json') return 'static'
  return 'demo'
}

// ─── Briefing Header ─────────────────────────────────────────────────────────

function BriefingHeader({ user, prefs, dashboard }) {
  const investorLabel = prefs?.investor_type?.replace(/_/g, ' ') ?? ''
  const assets = prefs?.interested_assets ?? []
  const sources = dashboard?.data_sources ?? {}

  const sourceEntries = [
    { label: 'Prices', src: sources.coin_prices },
    { label: 'News',   src: sources.market_news },
    { label: 'AI',     src: sources.ai_insight  },
    { label: 'Meme',   src: sources.meme        },
  ]

  return (
    <motion.div
      className="briefing-header"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
    >
      <div className="briefing-top">
        <div>
          <h2 className="briefing-greeting-text">
            Good {getTimeOfDay()}, {user?.name}
          </h2>
          <p className="briefing-sub">
            Market Intelligence Briefing · {dashboard?.date}
          </p>
        </div>
        {investorLabel && (
          <span className="investor-pill">{investorLabel}</span>
        )}
      </div>

      {assets.length > 0 && (
        <div className="briefing-assets">
          <span className="briefing-assets-label">Watching</span>
          {assets.map((a) => (
            <span key={a} className="tracking-tag">{a}</span>
          ))}
        </div>
      )}

      <div className="briefing-divider" />

      <div className="source-row">
        <span className="source-row-label">Data</span>
        {sourceEntries.map(({ label, src }) => (
          <span key={label} className="source-item">
            <span className={`source-dot ${src === 'live' ? 'source-dot-live' : 'source-dot-muted'}`} />
            {label} · {formatSourceLabel(src)}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Section sub-components ───────────────────────────────────────────────────

function MarketNews({ articles }) {
  return (
    <ul className="news-list">
      {articles.map((a, idx) => (
        <li key={a.id} className="news-item">
          <span className="news-number">{idx + 1}</span>
          <div className="news-body">
            {a.url !== '#' ? (
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                {a.title}
                <ArrowUpRight
                  size={10}
                  style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 3, opacity: 0.4 }}
                />
              </a>
            ) : (
              <span className="news-title-plain">{a.title}</span>
            )}
            <p className="news-meta">{a.source}</p>
          </div>
          {a.published_at && (
            <span className="news-time">
              {new Date(a.published_at).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric',
              })}
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
          <th className="col-rank">#</th>
          <th>Asset</th>
          <th>Price (USD)</th>
          <th>24h</th>
        </tr>
      </thead>
      <tbody>
        {prices.map((c, idx) => (
          <tr key={c.symbol}>
            <td className="col-rank">
              <span className="price-rank">{idx + 1}</span>
            </td>
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
                  <TrendingUp size={10} />+{c.change_24h.toFixed(2)}%
                </span>
              ) : (
                <span className="price-negative">
                  <TrendingDown size={10} />{c.change_24h.toFixed(2)}%
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AiInsight({ text, prefs }) {
  const investorType = prefs?.investor_type?.replace(/_/g, ' ') ?? ''
  const assets = prefs?.interested_assets ?? []

  return (
    <div className="ai-content">
      {(investorType || assets.length > 0) && (
        <div className="ai-profile-row">
          {investorType && (
            <>
              <span className="ai-profile-label">Profile</span>
              <span className="ai-profile-value">{investorType}</span>
            </>
          )}
          {assets.length > 0 && (
            <>
              {investorType && <span className="ai-separator">·</span>}
              <span className="ai-profile-label">Tracking</span>
              <span className="ai-profile-value">{assets.join(' · ')}</span>
            </>
          )}
        </div>
      )}

      <div className="ai-block">
        <span className="analyst-tag">AI-generated analysis</span>
        <p className="ai-text">{text}</p>
      </div>

      <div className="ai-disclaimer-inline">
        Not financial advice — AI-generated analysis based on your investor profile.
      </div>
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
    <span style={{
      display: 'inline-block', width: 5, height: 5,
      borderRadius: '50%', background: 'currentColor',
    }} />
  )
}

// ─── Generic section card ─────────────────────────────────────────────────────

function SectionCard({ sectionKey, dashboard, votes, index, prefs }) {
  const sourceLabel = dashboard.data_sources?.[SECTION_TYPE[sectionKey]]
  const isLive = sourceLabel === 'live'
  const isAi   = sectionKey === 'ai_insight'
  const { Icon, cls } = SECTION_ICONS[sectionKey]
  const sectionType   = SECTION_TYPE[sectionKey]
  const contentItemId = getContentItemId(sectionKey, dashboard)
  const initialVote   = votes?.[contentItemId] ?? null

  let body = null
  if (sectionKey === 'news')            body = <MarketNews articles={dashboard.market_news ?? []} />
  else if (sectionKey === 'prices')     body = <CoinPrices prices={dashboard.coin_prices ?? []} />
  else if (sectionKey === 'ai_insight') body = <AiInsight text={dashboard.ai_insight} prefs={prefs} />
  else if (sectionKey === 'meme')       body = <CryptoMeme meme={dashboard.meme} />

  const cardClass = [
    'section-card',
    isAi   ? 'section-card--primary' : '',
  ].filter(Boolean).join(' ')

  return (
    <motion.div
      className={cardClass}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.28, ease: 'easeOut' }}
      whileHover={{ y: -2, transition: { duration: 0.15, ease: 'easeOut' } }}
    >
      <div className="section-card-header">
        <div className={`section-card-icon ${cls}`}>
          <Icon size={14} />
        </div>
        <span className="section-card-title">{SECTION_LABELS[sectionKey]}</span>
        {sourceLabel && (
          <span className={`badge ${isLive ? 'badge-live' : 'badge-fallback'}`}>
            {isLive && <LiveDot />}
            {formatSourceLabel(sourceLabel)}
          </span>
        )}
      </div>

      {body}

      <VoteButtons
        sectionType={sectionType}
        contentItemId={contentItemId}
        contentSnapshot={buildContentSnapshot(sectionKey, dashboard, prefs)}
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
  // logout + navigate kept for the error-state fallback logout button

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
        const votesData = await getVotes().catch(() => ({ votes: {} }))
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
        Loading market data…
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
      transition={{ duration: 0.2 }}
    >
      <Navbar />

      <div className="dashboard-content">
        <BriefingHeader user={user} prefs={prefs} dashboard={dashboard} />

        <div className="cards-grid">
          {sections.map((key, i) => (
            <SectionCard
              key={key}
              sectionKey={key}
              dashboard={dashboard}
              votes={votes}
              index={i}
              prefs={prefs}
            />
          ))}
        </div>

        <p className="disclaimer">
          <strong>Disclaimer:</strong> This is not financial advice. All content is for
          informational purposes only. Always do your own research before making any
          investment decisions.
        </p>
      </div>
    </motion.div>
  )
}
