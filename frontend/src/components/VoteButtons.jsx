import { useState } from 'react'
import { submitVote } from '../services/feedbackApi'

const BTN = {
  base: {
    border: '1px solid #ccc',
    borderRadius: 4,
    padding: '3px 12px',
    cursor: 'pointer',
    fontSize: 16,
    background: 'transparent',
  },
  up: { background: '#2d6a4f', color: '#fff', borderColor: '#2d6a4f' },
  down: { background: '#c0392b', color: '#fff', borderColor: '#c0392b' },
}

export default function VoteButtons({
  dailyContentId,
  sectionType,
  contentItemId,
  initialVote = null,
}) {
  const [voted, setVoted] = useState(initialVote)  // restored from server on load
  const [justSaved, setJustSaved] = useState(false) // true only after a new action
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleVote(vote) {
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await submitVote(dailyContentId, sectionType, contentItemId, vote)
      setVoted(vote)
      setJustSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
      <button
        onClick={() => handleVote('up')}
        disabled={submitting}
        style={{ ...BTN.base, ...(voted === 'up' ? BTN.up : {}) }}
        title="Thumbs up"
      >
        👍
      </button>
      <button
        onClick={() => handleVote('down')}
        disabled={submitting}
        style={{ ...BTN.base, ...(voted === 'down' ? BTN.down : {}) }}
        title="Thumbs down"
      >
        👎
      </button>
      {justSaved && !error && <small style={{ color: '#666' }}>Saved!</small>}
      {error && <small style={{ color: '#c0392b' }}>{error}</small>}
    </div>
  )
}
