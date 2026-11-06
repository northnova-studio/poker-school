// Immagini di documenti FINTE per la demo, generate via canvas nel browser.
// Ogni immagine riporta "SPECIMEN — DEMO" e dati inventati: nessun documento reale.
// Contiene anche la compressione delle anteprime dei file caricati dall'utente (restano nel browser).
import type { DocumentType } from '../types'

const DOC_TITLE: Record<DocumentType, string> = {
  ID_CARD: "DOCUMENTO D'IDENTITÀ — FAC-SIMILE",
  PASSPORT: 'PASSAPORTO — FAC-SIMILE',
  DRIVING_LICENSE: 'PATENTE DI GUIDA — FAC-SIMILE',
}

interface SpecimenData {
  firstName: string
  lastName: string
  documentType: DocumentType
  last4: string
  seed: number
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-0.38)
  ctx.font = `800 ${Math.round(w / 9)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(190, 40, 40, 0.30)'
  ctx.fillText('SPECIMEN — DEMO', 0, 0)
  ctx.font = `700 ${Math.round(w / 32)}px system-ui, sans-serif`
  ctx.fillStyle = 'rgba(190, 40, 40, 0.38)'
  ctx.fillText('Documento finto generato per la demo · nessun dato reale', 0, w / 13)
  ctx.restore()
}

function silhouette(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hue: number) {
  ctx.save()
  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, `hsl(${hue}, 18%, 82%)`)
  g.addColorStop(1, `hsl(${hue}, 18%, 70%)`)
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = `hsl(${hue}, 10%, 42%)`
  ctx.beginPath()
  ctx.arc(x + w / 2, y + h * 0.38, w * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y + h * 0.98, w * 0.42, h * 0.36, 0, Math.PI, 0)
  ctx.fill()
  ctx.restore()
}

export function renderSpecimen(kind: 'FRONT' | 'BACK' | 'SELFIE', d: SpecimenData): string {
  const hue = d.seed % 360
  if (kind === 'SELFIE') {
    const { c, ctx } = canvas(600, 760)
    const g = ctx.createLinearGradient(0, 0, 0, 760)
    g.addColorStop(0, `hsl(${(hue + 200) % 360}, 20%, 78%)`)
    g.addColorStop(1, `hsl(${(hue + 200) % 360}, 16%, 58%)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 600, 760)
    silhouette(ctx, 90, 120, 420, 640, hue)
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.setLineDash([10, 8])
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(300, 330, 150, 200, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(20,20,20,0.75)'
    ctx.font = '600 22px system-ui, sans-serif'
    ctx.fillText('Selfie di prova', 24, 40)
    watermark(ctx, 600, 760)
    return c.toDataURL('image/jpeg', 0.82)
  }
  const { c, ctx } = canvas(856, 540)
  const g = ctx.createLinearGradient(0, 0, 856, 540)
  g.addColorStop(0, `hsl(${hue}, 22%, 90%)`)
  g.addColorStop(1, `hsl(${(hue + 40) % 360}, 20%, 80%)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 856, 540)
  // trama di sicurezza finta
  ctx.strokeStyle = `hsla(${hue}, 30%, 40%, 0.12)`
  ctx.lineWidth = 1
  for (let i = -540; i < 856; i += 14) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 540, 540)
    ctx.stroke()
  }
  ctx.fillStyle = `hsl(${hue}, 25%, 30%)`
  ctx.fillRect(0, 0, 856, 64)
  ctx.fillStyle = '#fff'
  ctx.font = '700 26px system-ui, sans-serif'
  ctx.fillText(DOC_TITLE[d.documentType], 28, 42)
  if (kind === 'FRONT') {
    silhouette(ctx, 36, 96, 220, 280, hue)
    const rows: [string, string][] = [
      ['Cognome', d.lastName.toUpperCase() || 'ROSSI'],
      ['Nome', d.firstName.toUpperCase() || 'MARIO'],
      ['Nato il', '01.01.1990 (inventato)'],
      ['Luogo', 'COMUNE DI ESEMPIO'],
      ['N. documento', `XX••••${d.last4}`],
      ['Scadenza', '31.12.2099'],
    ]
    rows.forEach(([k, v], i) => {
      ctx.fillStyle = 'rgba(30,30,30,0.6)'
      ctx.font = '500 16px system-ui, sans-serif'
      ctx.fillText(k, 296, 116 + i * 62)
      ctx.fillStyle = 'rgba(15,15,15,0.92)'
      ctx.font = '700 26px ui-monospace, monospace'
      ctx.fillText(v, 296, 146 + i * 62)
    })
    ctx.strokeStyle = 'rgba(20,20,20,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(40, 450)
    ctx.bezierCurveTo(90, 410, 130, 490, 180, 440)
    ctx.bezierCurveTo(210, 410, 230, 470, 250, 445)
    ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(20,20,20,0.85)'
    ctx.font = '600 18px system-ui, sans-serif'
    ctx.fillText('Retro — indirizzo e dati di esempio', 28, 110)
    ctx.font = '500 20px ui-monospace, monospace'
    ctx.fillText('VIA DEGLI ESEMPI 1, 00000 ESEMPIO', 28, 150)
    // codice a barre finto
    let x = 28
    for (let i = 0; i < 70; i++) {
      const w = ((d.seed >> (i % 24)) & 3) + 1
      ctx.fillRect(x, 190, w, 80)
      x += w + 3
    }
    ctx.font = '600 24px ui-monospace, monospace'
    const mrz = ['IDXXXSPECIMEN<<DEMO<<<<<<<<<<<<', `000000${d.last4}<<<NONVALIDO<<<<<<<<`, 'DEMO<<SPECIMEN<<<<<<<<<<<<<<<<<<']
    mrz.forEach((l, i) => ctx.fillText(l, 28, 380 + i * 40))
  }
  watermark(ctx, 856, 540)
  return c.toDataURL('image/jpeg', 0.82)
}

/** Anteprima compressa (dataURL JPEG) di un file immagine caricato: resta solo nel browser. */
export async function compressPreview(file: File, maxSide = 520, quality = 0.62): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const { c, ctx } = canvas(Math.max(1, Math.round(img.naturalWidth * scale)), Math.max(1, Math.round(img.naturalHeight * scale)))
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', quality)
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
