import { api } from './api'

export const submitVote = (section_type, content_item_id, vote, content_snapshot) =>
  api.post('/api/feedback', { section_type, content_item_id, vote, content_snapshot })

export const getVotes = () =>
  api.get('/api/feedback')
