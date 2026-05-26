const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getHeaders() {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function request(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: getHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((e) => e.msg || String(e)).join('; ')
      : data.detail
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return data
}

export const api = {
  get: (path) => request('GET', path, null),
  post: (path, body) => request('POST', path, body),
}
