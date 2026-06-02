import { jsPDF } from 'jspdf'
import type { BarShell, EquipItem, Services } from '../types'
import { STATUS_LABEL } from '../config/theme'

function servicesText(s: Services): string {
  const parts: string[] = []
  if (s.power) parts.push(s.power)
  if (s.water) parts.push('water')
  if (s.drain) parts.push('drain')
  if (s.gas) parts.push(s.gas)
  if (s.data) parts.push('data')
  return parts.join(', ')
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(items: EquipItem[], bar: BarShell): string {
  const head = ['Item', 'Product', 'W (mm)', 'D (mm)', 'H (mm)', 'Zone', 'Placement', 'Status', 'Services', 'Price (AUD)', 'Notes']
  const rows = items.map((i) => [
    i.label, i.product, i.w, i.d, i.h, i.zone, i.placement, STATUS_LABEL[i.status], servicesText(i.services), i.price ?? '', i.notes ?? '',
  ])
  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
  const lines = [head, ...rows].map((r) => r.map(csvCell).join(','))
  lines.push('')
  lines.push(csvCell('TOTAL (priced items)') + ',,,,,,,,,' + csvCell(total))
  lines.push('')
  lines.push('BAR ENVELOPE (mm)')
  lines.push('Front run length,' + bar.frontLen)
  lines.push('Front depth,' + bar.frontDepth)
  lines.push('Front height,' + bar.frontHeight)
  lines.push('Staff aisle (clear),' + bar.aisle)
  lines.push('Back run length,' + bar.backLen)
  lines.push('Back depth,' + bar.backDepth)
  lines.push('East return,' + bar.eastReturn)
  return lines.join('\n')
}

export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  triggerDownload(filename, url)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  triggerDownload(filename, dataUrl)
}

function triggerDownload(filename: string, href: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const PINE = '#35705E'
const INK = '#1C1A17'
const STONE = '#9A968C'

export function buildSchedulePdf(items: EquipItem[], bar: BarShell, planPng?: string, threePng?: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14
  let y = 18

  doc.setTextColor(PINE)
  doc.setFont('times', 'normal')
  doc.setFontSize(22)
  doc.text("Fletcher's — Bar Builder", M, y)
  y += 7
  doc.setFontSize(11)
  doc.setTextColor(STONE)
  doc.setFont('helvetica', 'normal')
  doc.text('Equipment schedule + bar envelope · Fellow Hospitality, 31A Fletcher St, Byron Bay', M, y)
  y += 8

  doc.setTextColor(INK)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Bar envelope (mm)', M, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(`Front ${bar.frontLen} × ${bar.frontDepth} (H ${bar.frontHeight})    Aisle ${bar.aisle} clear    Back ${bar.backLen} × ${bar.backDepth}    East return ${bar.eastReturn}`, M, y)
  y += 9

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Equipment schedule', M, y)
  y += 6

  const cols = [
    { h: 'Item', w: 34 }, { h: 'W×D×H', w: 28 }, { h: 'Zone', w: 38 },
    { h: 'Status', w: 20 }, { h: 'Services', w: 30 }, { h: 'AUD', w: 18 },
  ]
  const drawHead = () => {
    doc.setFillColor(53, 112, 94)
    doc.setTextColor('#ffffff')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    let x = M
    doc.rect(M, y - 4, W - 2 * M, 6, 'F')
    cols.forEach((c) => { doc.text(c.h, x + 1, y); x += c.w })
    y += 5
  }
  drawHead()
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(INK)
  doc.setFontSize(8)
  const lineH = 4.4
  items.forEach((i) => {
    const cells = [i.label, `${i.w}×${i.d}×${i.h}`, i.zone, STATUS_LABEL[i.status], servicesText(i.services), i.price != null ? String(i.price) : '—']
    const labelLines = doc.splitTextToSize(cells[0], cols[0].w - 2) as string[]
    const zoneLines = doc.splitTextToSize(cells[2], cols[2].w - 2) as string[]
    const rowLines = Math.max(labelLines.length, zoneLines.length, 1)
    const rowH = rowLines * lineH + 1
    if (y + rowH > doc.internal.pageSize.getHeight() - 14) {
      doc.addPage(); y = 18; drawHead()
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(INK)
    }
    let x = M
    doc.text(labelLines, x + 1, y); x += cols[0].w
    doc.text(cells[1], x + 1, y); x += cols[1].w
    doc.text(zoneLines, x + 1, y); x += cols[2].w
    doc.text(cells[3], x + 1, y); x += cols[3].w
    doc.text(doc.splitTextToSize(cells[4], cols[4].w - 2) as string[], x + 1, y); x += cols[4].w
    doc.text(cells[5], x + 1, y)
    doc.setDrawColor(220)
    doc.line(M, y + rowH - lineH, W - M, y + rowH - lineH)
    y += rowH
  })

  const total = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`Total (priced items): A$ ${total.toLocaleString()}`, M, y)

  const addImg = (title: string, png?: string) => {
    if (!png) return
    doc.addPage()
    let yy = 18
    doc.setTextColor(PINE); doc.setFont('times', 'normal'); doc.setFontSize(16)
    doc.text(title, M, yy); yy += 6
    try {
      const props = doc.getImageProperties(png)
      const maxW = W - 2 * M
      doc.addImage(png, 'PNG', M, yy, maxW, (props.height / props.width) * maxW)
    } catch { /* ignore */ }
  }
  addImg('2D plan', planPng)
  addImg('3D box model', threePng)
  doc.save('fletchers-bar-schedule.pdf')
}
