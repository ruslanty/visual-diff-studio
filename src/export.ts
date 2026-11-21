import { formatPercentage } from './comparison.ts'
import { renderReport } from './report.ts'
import type { ReportPair } from './report.ts'
import { buildComparison, drawRaster, makeCanvas } from './screenshots.ts'
import type { Comparison, Screenshot } from './screenshots.ts'
import type { Pair } from './pairing.ts'

export function letBrowserPaint() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0))
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function pngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not encode the PNG.'))
    }, 'image/png')
  })
}

export async function downloadComparison(pair: Pair<Screenshot>, comparison: Comparison) {
  const { before, after, diff, stats } = comparison
  const gap = 16
  const header = 95
  const imageTop = header + 36
  const scale = Math.min(
    Math.max(1, 240 / Math.max(stats.width, stats.height)),
    (4096 - gap * 4) / (stats.width * 3),
    (4096 - imageTop - gap) / stats.height,
  )
  const column = Math.max(140, Math.ceil(stats.width * scale))
  const imageHeight = Math.max(1, Math.ceil(stats.height * scale))
  const { canvas, context } = makeCanvas(column * 3 + gap * 4, imageTop + imageHeight + gap)

  context.fillStyle = '#f6f6fb'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#211c35'
  context.font = 'bold 24px system-ui'
  context.fillText(pair.name, gap, 34, canvas.width - gap * 2)
  context.font = '15px system-ui'
  const percent = formatPercentage(stats.changed, stats.total)
  const mismatch = stats.sizeMismatch ? ' · Image sizes differ' : ''
  context.fillText(`${percent} changed · ${stats.changed.toLocaleString('en-US')} of ${stats.total.toLocaleString('en-US')} pixels${mismatch}`,
    gap, 61, canvas.width - gap * 2)

  const panels = [
    { label: 'Before', color: '#6ce3c6', source: before },
    { label: 'After', color: '#ad99ff', source: after },
    { label: 'Pixel diff', color: '#eb4171', source: diff },
  ]
  panels.forEach(({ label, source, color }, index) => {
    const x = gap + index * (column + gap)
    context.fillStyle = '#26223a'
    context.fillRect(x, header, column, imageTop - header + imageHeight)
    context.fillStyle = color
    context.font = 'bold 15px system-ui'
    context.fillText(label, x + 10, header + 23)
    drawRaster(context, source, x, imageTop, scale)
  })

  const safeName = pair.name.replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 100) || 'comparison'
  download(await pngBlob(canvas), `${safeName}-visual-diff.png`)
}

function reportImage(
  source: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
) {
  const scale = Math.min(1, 1600 / Math.max(width, height))
  const { canvas, context } = makeCanvas(Math.ceil(width * scale), Math.ceil(height * scale))
  drawRaster(context, source, 0, 0, scale)
  const url = canvas.toDataURL('image/png')
  canvas.width = 0
  return url
}

function createReportPair(pair: Pair<Screenshot>, comparison: Comparison): ReportPair {
  const { before, after, diff, stats } = comparison
  const { width, height } = stats
  return {
    name: pair.name,
    before: {
      name: pair.before.name,
      width: before.naturalWidth,
      height: before.naturalHeight,
      src: reportImage(before, width, height),
    },
    after: {
      name: pair.after.name,
      width: after.naturalWidth,
      height: after.naturalHeight,
      src: reportImage(after, width, height),
    },
    diff: reportImage(diff, width, height),
    stats,
  }
}

export async function downloadReport(
  pairs: Pair<Screenshot>[],
  activePair: Pair<Screenshot> | undefined,
  activeComparison: Comparison | undefined,
) {
  const entries: ReportPair[] = []
  for (const pair of pairs) {
    await letBrowserPaint()
    try {
      const comparison = pair === activePair && activeComparison ? activeComparison : buildComparison(pair)
      entries.push(createReportPair(pair, comparison))
    } catch (error) {
      entries.push({ name: pair.name, error: error instanceof Error ? error.message : 'Could not compare this pair.' })
    }
  }
  download(new Blob([renderReport(entries)], { type: 'text/html' }), 'visual-diff-report.html')
}
