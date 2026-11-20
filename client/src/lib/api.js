import axios from 'axios'

/**
 * In development the Vite dev server proxies /api, /uploads and /socket.io to the backend.
 * In production, set VITE_API_URL to the full URL of your API (e.g. https://api.example.com).
 */
export const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  timeout: 30000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data
    err.userMessage =
      data?.message ||
      (err.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : err.code === 'ECONNABORTED' ? 'The request timed out' : err.message)
    err.serverCode = data?.code
    err.serverData = data
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('connectly:unauthorized'))
    }
    return Promise.reject(err)
  }
)

export const errMsg = (e) => e?.userMessage || e?.message || 'Something went wrong'

/** Resolves a stored asset URL (local uploads are stored as relative paths). */
export const assetUrl = (url) => {
  if (!url) return null
  if (/^(https?:|blob:|data:)/.test(url)) return url
  return `${API_URL}${url}`
}
