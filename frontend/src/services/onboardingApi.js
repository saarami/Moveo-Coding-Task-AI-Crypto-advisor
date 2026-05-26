import { api } from './api'

export const getPreferences = () => api.get('/api/onboarding/preferences')

export const savePreferences = (interested_assets, investor_type, content_types) =>
  api.post('/api/onboarding/preferences', { interested_assets, investor_type, content_types })
