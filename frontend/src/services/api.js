import axios from 'axios'

const RENDER_URL = 'https://sistema-suinos.onrender.com'
const envUrl = import.meta.env.VITE_API_URL
const API_URL = (envUrl && !envUrl.includes('railway')) ? envUrl : RENDER_URL

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000  // 60s — aguarda Render acordar do cold start (free tier dorme após 15min)
})

// Emite evento global quando o servidor está acordando (para mostrar aviso ao usuário)
let coldStartWarningShown = false
function notifyColdStart() {
  if (!coldStartWarningShown) {
    coldStartWarningShown = true
    window.dispatchEvent(new CustomEvent('render-cold-start'))
    // Limpa o aviso depois de 20s
    setTimeout(() => {
      coldStartWarningShown = false
      window.dispatchEvent(new CustomEvent('render-ready'))
    }, 20000)
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config
    const status = error.response?.status
    const msg = error.response?.data?.msg || error.response?.data?.error || ''
    const isJwtError = status === 422 && (msg.includes('string') || msg.includes('token') || msg.includes('Subject'))
    const isLoginEndpoint = config?.url?.includes('/auth/login')

    // Auto-retry para erros de rede ou 5xx (Render cold start / Neon SSL drop)
    // GET: 3 tentativas | POST/PUT/DELETE: 2 tentativas (cold start pode afetar qualquer método)
    const method = config?.method?.toLowerCase()
    const isServerError = !error.response || status >= 500
    const maxRetries = method === 'get' ? 3 : 2
    config._retries = config._retries || 0

    if (isServerError && config._retries < maxRetries) {
      config._retries++
      if (config._retries === 1) notifyColdStart()
      // Espera crescente: 2s, 4s (GET chega a 6s)
      await new Promise(r => setTimeout(r, 2000 * config._retries))
      return api(config)
    }

    // Sessão expirada ou inválida → limpa e redireciona
    if (!isLoginEndpoint && (status === 401 || isJwtError)) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api
