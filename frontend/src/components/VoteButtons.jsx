import { useState } from 'react'
import { motion } from 'framer-motion'
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { submitVote } from '../services/feedbackApi'

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
    <div className="vote-row">
      <span className="vote-label">Helpful?</span>

      <motion.button
        className={`vote-btn${voted === 'up' ? ' voted-up' : ''}`}
        onClick={() => handleVote('up')}
        disabled={submitting}
        whileTap={{ scale: 0.9 }}
        title="Thumbs up"
      >
        <ThumbsUp size={12} />
        Yes
      </motion.button>

      <motion.button
        className={`vote-btn${voted === 'down' ? ' voted-down' : ''}`}
        onClick={() => handleVote('down')}
        disabled={submitting}
        whileTap={{ scale: 0.9 }}
        title="Thumbs down"
      >
        <ThumbsDown size={12} />
        No
      </motion.button>

      {justSaved && !error && (
        <motion.span
          className="vote-saved"
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Check size={11} />
          Saved
        </motion.span>
      )}
      {error && <span className="vote-error">{error}</span>}
    </div>
  )
}
