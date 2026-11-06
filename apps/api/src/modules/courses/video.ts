// Adapter video: Bunny Stream con Embed Token Authentication.
// token = SHA256_HEX(token_security_key + video_id + expires) — vedi docs Bunny Stream
// "Embed view token authentication". Se Bunny non è configurato (o la lezione non ha
// ancora un video) si restituisce una pagina segnaposto servita da questa API.
import { env } from '../../config/env.js'
import { sha256Hex } from '../../lib/crypto.js'

export interface VideoLessonLike {
  id: string
  title: string
  videoProvider: 'NONE' | 'BUNNY'
  videoId: string | null
}

export function videoUrlFor(lesson: VideoLessonLike, apiBaseUrl: string, now = Date.now()) {
  const expires = Math.floor(now / 1000) + env.VIDEO_URL_TTL_SECONDS
  if (env.bunnyEnabled && lesson.videoProvider === 'BUNNY' && lesson.videoId) {
    const token = sha256Hex(`${env.BUNNY_STREAM_TOKEN_KEY}${lesson.videoId}${expires}`)
    const host = env.BUNNY_STREAM_EMBED_HOST.replace(/\/$/, '')
    const url = `${host}/embed/${env.BUNNY_STREAM_LIBRARY_ID}/${lesson.videoId}?token=${token}&expires=${expires}`
    return { lessonId: lesson.id, url, expiresAt: new Date(expires * 1000).toISOString() }
  }
  return {
    lessonId: lesson.id,
    url: `${apiBaseUrl}/api/v1/video/placeholder?lesson=${encodeURIComponent(lesson.id)}`,
    expiresAt: new Date(expires * 1000).toISOString(),
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export function placeholderHtml(title: string) {
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Video in arrivo</title>
<style>html,body{margin:0;height:100%;background:#101814;color:#ECE6D8;font:16px/1.5 system-ui,sans-serif}
main{height:100%;display:grid;place-items:center;text-align:center;padding:24px}small{color:#9AA59D}</style></head>
<body><main><div><strong>${esc(title)}</strong><br><small>Video non ancora caricato su Bunny Stream (o servizio video non configurato).</small></div></main></body></html>`
}
