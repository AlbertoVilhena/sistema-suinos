import axios from 'axios'

const RENDER_URL = 'https://sistema-suinos.onrender.com'
const envUrl = import.meta.env.VITE_API_URL
const API_URL = (envUrl && !envUrl.includes('railway')) ? envUrl : RENDER_URL

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000  // 15s — aguarda Render acordar do cold start
})

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

    // Auto-retry para GET em erros de rede ou 5xx (Render cold start / Neon SSL drop)
    // Evita dados zerados na primeira carga sem precisar atualizar a página
    const isGet = config?.method?.toLowerCase() === 'get'
    const isServerError = !error.response || status >= 500
    config._retries = config._retries || 0

    if (isGet && isServerError && config._retries < 2) {
      config._retries++
      // Espera crescente: 1s na 1ª tentativa, 2s na 2ª
      await new Promise(r => setTimeout(r, 1000 * config._retries))
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
