import { api } from './api'

export const submitVote = (daily_content_id, section_type, content_item_id, vote) =>
  api.post('/api/feedback', { daily_content_id, section_type, content_item_id, vote })

export const getVotes = (daily_content_id) =>
  api.get(`/api/feedback?daily_content_id=${daily_content_id}`)
