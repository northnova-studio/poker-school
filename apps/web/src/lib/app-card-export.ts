// Export della Player Card: SVG → canvas → PNG (formato 4:5 da social), tutto nel browser.
// Le variabili CSS del tema vengono risolte nei valori correnti prima di rasterizzare.

function resolveVars(str: string): string {
  const cs = getComputedStyle(document.documentElement)
  let out = str
  for (let i = 0; i < 4 && out.includes('var(--'); i++) {
    // le virgolette doppie (es. nei font) romperebbero l'attributo style dell'SVG serializzato
    out = out.replace(/var\((--[a-z0-9-]+)\)/gi, (_m, name: string) => (cs.getPropertyValue(name).trim() || 'currentColor').replace(/"/g, "'"))
  }
  return out
}

export async function cardToPng(svg: SVGSVGElement, opts: { title: string; footer: string }): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', '640')
  clone.setAttribute('height', '920')
  const src = resolveVars(new XMLSerializer().serializeToString(clone))
  const img = new Image()
  img.decoding = 'async'
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`
  await img.decode()

  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const cs = getComputedStyle(document.documentElement)
  const v = (n: string) => cs.getPropertyValue(n).trim()
  ctx.fillStyle = v('--c-bg') || '#101814'
  ctx.fillRect(0, 0, W, H)
  // velo radiale col colore d'accento
  const g = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, W * 0.7)
  g.addColorStop(0, v('--c-surface-2') || '#1e2b25')
  g.addColorStop(1, v('--c-bg') || '#101814')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  const ch = 1040
  const cw = (ch * 640) / 920
  ctx.drawImage(img, (W - cw) / 2, 90, cw, ch)
  ctx.fillStyle = v('--c-ink') || '#ece6d8'
  ctx.font = '700 34px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(opts.title, W / 2, 62)
  ctx.fillStyle = v('--c-muted') || '#9aa59d'
  ctx.font = '500 26px system-ui, sans-serif'
  ctx.fillText(opts.footer, W / 2, H - 44)
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Export non riuscito'))), 'image/png'))
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadText(text: string, filename: string, mime = 'text/csv;charset=utf-8') {
  downloadBlob(new Blob(['﻿', text], { type: mime }), filename)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}
