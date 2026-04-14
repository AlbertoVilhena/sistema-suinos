import axios from 'axios'

const RENDER_URL = 'https://sistema-suinos.onrender.com'
const envUrl = import.meta.env.VITE_API_URL
const API_URL = (envUrl && !envUrl.includes('railway')) ? envUrl : RENDER_URL

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
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
  (error) => {
    const status = error.response?.status
    const msg = error.response?.data?.msg || error.response?.data?.error || ''
    const isJwtError = status === 422 && (msg.includes('string') || msg.includes('token') || msg.includes('Subject'))
    if (status === 401 || isJwtError) {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
