import { formatPercentage } from './comparison.ts'

interface ReportImage {
  name: string
  width: number
  height: number
  src: string
}

export type ReportPair = { name: string } & ({
  before: ReportImage
  after: ReportImage
  diff: string
  stats: { changed: number; total: number; sizeMismatch: boolean }
} | { error: string })

function escapeHtml(text: string) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function figure(label: string, src: string, image?: ReportImage) {
  return `<figure>
    <figcaption><strong>${label}</strong>${image ? `<span>${escapeHtml(image.name)} · ${image.width} × ${image.height}</span>` : ''}</figcaption>
    <img alt="${label === 'Pixel diff' ? 'Changed pixels highlighted in pink' : `${label} screenshot`}" src="${escapeHtml(src)}">
  </figure>`
}

export function renderReport(pairs: ReportPair[]) {
  const count = new Intl.NumberFormat('en-US')
  const articles = pairs.map((pair) => {
    const heading = `<h2>${escapeHtml(pair.name)}</h2>`
    if ('error' in pair) return `<article>${heading}<p class="warning">${escapeHtml(pair.error)}</p></article>`

    const { before, after, diff, stats } = pair
    return `<article>${heading}
      <p class="summary"><strong>${formatPercentage(stats.changed, stats.total)}</strong> changed
        <span>· ${count.format(stats.changed)} of ${count.format(stats.total)} pixels</span></p>
      ${stats.sizeMismatch ? '<p class="warning">Image sizes differ. Images align at the top left. Extra pixels count as changes.</p>' : ''}
      <div class="images">
        ${figure('Before', before.src, before)}
        ${figure('After', after.src, after)}
        ${figure('Pixel diff', diff)}
      </div>
    </article>`
  }).join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>Visual Diff Studio report</title>
<style>
  * { box-sizing: border-box }
  body { margin: 0; background: #f6f6fb; color: #211c35; font: 15px/1.5 system-ui, sans-serif }
  main { width: min(1440px, 100% - 32px); margin: 42px auto }
  h1 { margin: 0; font-size: clamp(27px, 4.5vw, 42px); line-height: 1.1 }
  h2 { margin: 0; font-size: 21px; overflow-wrap: anywhere }
  p { margin: 6px 0 0; color: #5f576f }
  article { margin-top: 20px; padding: 16px; border: 1px solid #e4e0ed; border-radius: 10px; background: #fff }
  .summary strong { color: #5837b7 }
  .warning { padding: 9px 12px; border-radius: 6px; background: #fff1d8; color: #67470d }
  .images { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 15px }
  figure { margin: 0; overflow: hidden; border: 1px solid #e4e0ed; border-radius: 7px; background: #25233b }
  figcaption { min-height: 58px; display: grid; align-content: center; padding: 6px 10px; background: #f6f3fb; overflow-wrap: anywhere }
  figcaption span { color: #5f576f; font-size: 12px }
  img { display: block; width: 100%; height: auto; background: #25233b }
  @media (max-width: 720px) { .images { grid-template-columns: 1fr } }
</style>
</head>
<body><main>
  <header><h1>Visual Diff Studio report</h1><p>${pairs.length} screenshot ${pairs.length === 1 ? 'pair' : 'pairs'}</p></header>
  ${articles}
</main></body>
</html>`
}
