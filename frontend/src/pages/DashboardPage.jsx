import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

// Maps frontend section key → data_sources field name in the API response.
const SOURCE_KEY = {
  news: 'market_news',
  prices: 'coin_prices',
  ai_insight: 'ai_insight',
  meme: 'meme',
}

// Maps frontend section key → backend section_type value used in feedback.
const SECTION_TYPE = {
  news: 'market_news',
  prices: 'coin_prices',
  ai_insight: 'ai_insight',
  meme: 'meme',
}

// Returns the content_item_id to use when submitting or matching a vote for a section.
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
    <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
      {articles.map((a) => (
        <li key={a.id} style={{ marginBottom: 14 }}>
          {a.url !== '#' ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer">
              <strong>{a.title}</strong>
            </a>
          ) : (
            <strong>{a.title}</strong>
          )}
          <p style={{ margin: '4px 0 2px' }}>{a.summary}</p>
          <small style={{ color: '#888' }}>
            {a.source} · {new Date(a.published_at).toLocaleDateString()}
          </small>
        </li>
      ))}
    </ul>
  )
}

function CoinPrices({ prices }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
          <th style={{ textAlign: 'left', paddingBottom: 8 }}>Coin</th>
          <th style={{ textAlign: 'right', paddingBottom: 8 }}>Price (USD)</th>
          <th style={{ textAlign: 'right', paddingBottom: 8 }}>24h Change</th>
        </tr>
      </thead>
      <tbody>
        {prices.map((c) => (
          <tr key={c.symbol} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={{ padding: '6px 0' }}>
              <strong>{c.symbol}</strong>
            </td>
            <td style={{ textAlign: 'right', padding: '6px 0' }}>
              ${c.price_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
            </td>
            <td
              style={{
                textAlign: 'right',
                padding: '6px 0',
                color: c.change_24h >= 0 ? '#2d6a4f' : '#c0392b',
                fontWeight: 500,
              }}
            >
              {c.change_24h >= 0 ? '+' : ''}
              {c.change_24h.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function AiInsight({ text }) {
  return <p style={{ margin: 0, lineHeight: 1.6 }}>{text}</p>
}

function CryptoMeme({ meme }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={meme.image_url}
        alt={meme.caption}
        style={{ maxWidth: '100%', borderRadius: 6 }}
      />
      <p style={{ margin: '10px 0 0', fontStyle: 'italic' }}>{meme.caption}</p>
    </div>
  )
}

// ─── Generic section card ─────────────────────────────────────────────────────

function SectionCard({ sectionKey, dashboard, votes }) {
  const sourceLabel = dashboard.data_sources?.[SOURCE_KEY[sectionKey]]
  const isLive = sourceLabel === 'live'
  const sectionType = SECTION_TYPE[sectionKey]
  const contentItemId = getContentItemId(sectionKey, dashboard)
  const voteEntry = votes?.[sectionType]
  const initialVote = voteEntry?.content_item_id === contentItemId ? voteEntry.vote : null

  let body = null
  if (sectionKey === 'news') body = <MarketNews articles={dashboard.market_news ?? []} />
  else if (sectionKey === 'prices') body = <CoinPrices prices={dashboard.coin_prices ?? []} />
  else if (sectionKey === 'ai_insight') body = <AiInsight text={dashboard.ai_insight} />
  else if (sectionKey === 'meme') body = <CryptoMeme meme={dashboard.meme} />

  return (
    <div
      style={{
        marginBottom: 20,
        padding: '16px 20px',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{SECTION_LABELS[sectionKey]}</h2>
        {sourceLabel && (
          <span
            style={{
              fontSize: 11,
              padding: '2px 7px',
              borderRadius: 4,
              fontWeight: 500,
              background: isLive ? '#e6f4ea' : '#f5f5f5',
              color: isLive ? '#2d6a4f' : '#888',
            }}
          >
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
    </div>
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

  function handleLogout() {
    logout()
    navigate('/login')
  }

  if (loading) return <p style={{ padding: 24 }}>Loading dashboard…</p>

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: 'red' }}>Failed to load dashboard: {error}</p>
        <button onClick={handleLogout}>Logout</button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: '0 0 4px' }}>Your Dashboard</h1>
          <p style={{ margin: 0, color: '#666' }}>
            {user?.name} · {dashboard?.investor_type?.replace(/_/g, ' ')} · {dashboard?.date}
          </p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {sections.map((key) => (
        <SectionCard key={key} sectionKey={key} dashboard={dashboard} votes={votes} />
      ))}
    </div>
  )
}
