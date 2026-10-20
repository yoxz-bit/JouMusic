import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = Number(process.env.PORT || 3000)
const apiKey = process.env rohan2bd10d96ec9145d9
const baseUrl = 'https://kyzorohan.web.id/api'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))

async function upstream(endpoint, params) {
  if (!apiKey) {
    const error = new Error('API key belum diatur. Salin .env.example menjadi .env lalu isi SPOTIFY_API_KEY.')
    error.status = 503
    throw error
  }
  const url = new URL(`${baseUrl}/${endpoint}`)
  for (const [key, value] of Object.entries({ ...params, key: apiKey })) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
  if (!response.ok) {
    const error = new Error(`Penyedia API merespons HTTP ${response.status}`)
    error.status = 502
    throw error
  }
  return response.json()
}

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 160)
  if (!query) return res.status(400).json({ status: false, error: 'Masukkan judul lagu atau nama artis.' })
  try {
    const payload = await upstream('spotifysearch', { query })
    const tracks = Array.isArray(payload?.data) ? payload.data.map(item => ({
      id: String(item.tid || item.spotifyUrl || `${item.name}-${item.artist}`),
      title: String(item.name || 'Judul tidak diketahui'),
      artist: String(item.artist || 'Artis tidak diketahui'),
      album: item.album ?? null,
      duration: String(item.duration || ''),
      cover: safeImage(item.cover),
      spotifyUrl: safeSpotify(item.spotifyUrl),
      date: item.date ?? null
    })) : []
    res.json({ status: Boolean(payload?.status), tracks })
  } catch (error) {
    res.status(error.status || 502).json({ status: false, error: error.message || 'Pencarian gagal.' })
  }
})

app.get('/api/play', async (req, res) => {
  const query = String(req.query.q || '').trim().slice(0, 160)
  if (!query) return res.status(400).json({ status: false, error: 'Query lagu diperlukan.' })
  try {
    const payload = await upstream('spotifyplay', { q: query })
    const outer = payload?.result
    const result = outer?.result
    const audioUrl = safeAudio(result?.download)
    if (!payload?.status || !outer?.success || !audioUrl) {
      return res.status(502).json({ status: false, error: 'API tidak mengembalikan URL audio yang valid.' })
    }
    res.json({
      status: true,
      track: {
        title: String(result?.title || outer?.search?.title || query),
        artist: String(result?.artist || outer?.search?.artist || ''),
        cover: safeImage(result?.cover || outer?.search?.cover),
        duration: Number(result?.duration || 0),
        spotifyUrl: safeSpotify(result?.spotify || outer?.search?.spotifyUrl)
      },
      audioUrl
    })
  } catch (error) {
    res.status(error.status || 502).json({ status: false, error: error.message || 'Tidak bisa menyiapkan audio.' })
  }
})

function safeImage(value) {
  try { const u = new URL(value); return u.protocol === 'https:' ? u.href : '' } catch { return '' }
}
function safeSpotify(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'open.spotify.com' ? u.href : '' } catch { return '' }
}
function safeAudio(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' ? u.href : ''
  } catch { return '' }
}

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')))
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
}
app.use((error, _req, res, _next) => res.status(500).json({ status: false, error: 'Terjadi kesalahan server.' }))

app.listen(port, () => console.log(`JOÜGA MUSIC server berjalan di http://localhost:${port}`))
