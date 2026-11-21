import { useEffect, useMemo, useState } from 'react'
import {
  LuChevronRight, LuChevronsLeftRight, LuDownload, LuFileCode2, LuImage, LuImages, LuMousePointer2,
  LuRotateCcw, LuShieldCheck, LuStar, LuTriangleAlert,
} from 'react-icons/lu'
import { CompareView, ViewControls } from './CompareView.tsx'
import type { Mode } from './CompareView.tsx'
import { formatPercentage } from './comparison.ts'
import { downloadComparison, downloadReport, letBrowserPaint } from './export.ts'
import { matchScreenshots } from './pairing.ts'
import type { Pair, Side } from './pairing.ts'
import { buildComparison, loadExamples, readFiles } from './screenshots.ts'
import type { Comparison, Screenshot } from './screenshots.ts'
import { sideLabels, UploadZone } from './UploadZone.tsx'

type Sources = Record<Side, Screenshot[]>
type Upload = Awaited<ReturnType<typeof readFiles>> & { fileCount: number }

const emptyUpload: Upload = { screenshots: [], errors: [], fileCount: 0 }
const emptyUploads = { before: emptyUpload, after: emptyUpload }
const initialPosition = 50
const numbers = new Intl.NumberFormat('en-US')

function useComparison(pair: Pair<Screenshot> | undefined) {
  const [result, setResult] = useState<{ pair: Pair<Screenshot>; comparison?: Comparison; error?: string }>()
  useEffect(() => {
    if (!pair) {
      setResult(undefined)
      return
    }
    const timer = window.setTimeout(() => {
      try {
        setResult({ pair, comparison: buildComparison(pair) })
      } catch (error) {
        setResult({ pair, error: error instanceof Error ? error.message : 'Could not compare this pair.' })
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [pair])
  return result && result.pair === pair ? result : undefined
}

function Size({ image }: { image?: HTMLImageElement }) {
  return image ? <>{image.naturalWidth} × {image.naturalHeight}</> : '—'
}

export function App() {
  const [example, setExample] = useState<Sources>()
  const [exampleError, setExampleError] = useState(false)
  const [usingExample, setUsingExample] = useState(true)
  const [uploads, setUploads] = useState<Record<Side, Upload>>(emptyUploads)
  const [busy, setBusy] = useState({ before: false, after: false })
  const [index, setIndex] = useState(0)
  const [mode, setMode] = useState<Mode>('slider')
  const [position, setPosition] = useState(initialPosition)
  const [exporting, setExporting] = useState<'png' | 'html'>()
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    let ignore = false
    void loadExamples().then(
      (sources) => { if (!ignore) setExample(sources) },
      () => { if (!ignore) setExampleError(true) },
    )
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    function keepFileDropsOnPage(event: DragEvent) {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }

    window.addEventListener('dragover', keepFileDropsOnPage)
    window.addEventListener('drop', keepFileDropsOnPage)
    return () => {
      window.removeEventListener('dragover', keepFileDropsOnPage)
      window.removeEventListener('drop', keepFileDropsOnPage)
    }
  }, [])

  const beforeFiles = usingExample ? example?.before ?? emptyUpload.screenshots : uploads.before.screenshots
  const afterFiles = usingExample ? example?.after ?? emptyUpload.screenshots : uploads.after.screenshots
  const allowDifferentNames = !usingExample && uploads.before.fileCount === 1 && uploads.after.fileCount === 1
  const { pairs, unmatched } = useMemo(
    () => matchScreenshots(beforeFiles, afterFiles, allowDifferentNames),
    [beforeFiles, afterFiles, allowDifferentNames],
  )
  const pair = pairs[index]
  const result = useComparison(pair)
  const comparison = result?.comparison
  const before = pair?.before.image
  const after = pair?.after.image
  const sizeMismatch = before && after && (
    before.naturalWidth !== after.naturalWidth || before.naturalHeight !== after.naturalHeight
  )
  const errors = [...uploads.before.errors, ...uploads.after.errors]
  const uploading = busy.before || busy.after

  async function upload(side: Side, files: File[]) {
    setBusy((current) => ({ ...current, [side]: true }))
    try {
      const result = await readFiles(files)
      setUploads((current) => ({ ...current, [side]: { ...result, fileCount: files.length } }))
      setUsingExample(false)
      setIndex(0)
      setPosition(initialPosition)
    } finally {
      setBusy((current) => ({ ...current, [side]: false }))
    }
  }

  function resetExample() {
    setUploads(emptyUploads)
    setUsingExample(true)
    setIndex(0)
    setMode('slider')
    setPosition(initialPosition)
  }

  async function exportFiles(format: 'png' | 'html') {
    setExporting(format)
    setExportError('')
    try {
      if (format === 'png' && pair && comparison) {
        await letBrowserPaint()
        await downloadComparison(pair, comparison)
      } else if (format === 'html') {
        await downloadReport(pairs, pair, comparison)
      }
    } catch {
      setExportError('Could not download the export. Try again.')
    } finally {
      setExporting(undefined)
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="shell topbar-inner">
          <div className="brand">
            <span className="brand-icon"><LuChevronsLeftRight aria-hidden="true" /></span>
            <span>Visual Diff Studio</span>
          </div>
          <div className="privacy"><LuShieldCheck aria-hidden="true" /> Processed in your browser</div>
          <a
            className="button repository-link"
            href="https://github.com/ruslanty/visual-diff-studio"
            target="_blank"
            rel="noopener noreferrer"
          >
            <LuStar aria-hidden="true" /> Star on GitHub
          </a>
        </div>
      </header>

      <main className="shell main">
        <div className="intro">
          <div>
            <h1>Compare screenshots</h1>
            <p>Review visual changes and share the evidence in your pull request.</p>
          </div>
          <div className="export-actions">
            <button className="button" type="button" disabled={!comparison || uploading || !!exporting} onClick={() => void exportFiles('png')}>
              <LuDownload aria-hidden="true" />{exporting === 'png' ? 'Preparing PNG…' : 'Export PNG'}
            </button>
            <button className="button primary-button" type="button" disabled={pairs.length === 0 || uploading || !!exporting} onClick={() => void exportFiles('html')}>
              <LuFileCode2 aria-hidden="true" />{exporting === 'html' ? 'Preparing report…' : 'HTML report'}
            </button>
          </div>
        </div>
        {exportError && <p className="notice" role="alert">{exportError}</p>}

        <section aria-label="Screenshot uploads">
          <div className="upload-grid">
            {(['before', 'after'] as const).map((side) => (
              <UploadZone key={side} side={side} files={uploads[side].screenshots} busy={busy[side]} onFiles={(files) => void upload(side, files)} />
            ))}
          </div>
          <div className="upload-help">
            <span>PNG, JPEG or WebP <span className="help-dot">·</span> Batch files match by name</span>
            {usingExample && example && <span className="example-label"><span /> Example loaded</span>}
            {!usingExample && example && (
              <button className="text-button" type="button" disabled={uploading} onClick={resetExample}>
                <LuRotateCcw aria-hidden="true" /> Load example
              </button>
            )}
          </div>
          {errors.length > 0 && (
            <div className="notice" role="alert"><LuTriangleAlert aria-hidden="true" /><div>
              <strong>Some files could not be opened</strong>
              <ul>{errors.map((error, i) => <li key={i}>{error}</li>)}</ul>
            </div></div>
          )}
          {unmatched.length > 0 && (
            <details className="notice unmatched">
              <summary>{unmatched.length} unmatched {unmatched.length === 1 ? 'file' : 'files'}</summary>
              <ul>{unmatched.map(({ side, file }, i) => <li key={i}>{sideLabels[side]} · {file.name}</li>)}</ul>
            </details>
          )}
        </section>

        <div className="workspace">
          <section className="viewer" aria-label="Comparison">
            <div className="viewer-top">
              <ViewControls mode={mode} onChange={setMode} />
              {pair && (
                <span className="file-tag" title={`${pair.before.name} → ${pair.after.name}`}>
                  <LuImage aria-hidden="true" /><span>{pair.before.name}</span>
                </span>
              )}
            </div>
            {sizeMismatch && (
              <div className="notice size-notice" role="status">
                <LuTriangleAlert aria-hidden="true" />
                <span>Image sizes differ. Images align at the top left. Extra pixels count as changes.</span>
              </div>
            )}
            {comparison ? <CompareView comparison={comparison} mode={mode} position={position} onSlide={setPosition} /> : (
              <div className="empty-view" role="status">
                <LuImages aria-hidden="true" />
                <p>{result?.error ?? (pair || (usingExample && !example && !exampleError) ? 'Preparing comparison…' : 'Your comparison will appear here.')}</p>
                {exampleError && usingExample && !pair && <span>The example could not load. Add your own screenshots.</span>}
                {!usingExample && !pair && <span>Add screenshots to both sides. For batches, use matching filenames.</span>}
              </div>
            )}
            <div className="viewer-bottom">
              {mode === 'slider' && <><LuMousePointer2 aria-hidden="true" /><span>Drag the divider to compare</span></>}
              {mode === 'side-by-side' && <><span className="legend-dot before" /><span>Before</span><span className="legend-dot after" /><span>After</span></>}
              {mode === 'diff' && <><span className="legend-dot changed" /><span>Changed</span><span className="legend-dot unchanged" /><span>Unchanged</span></>}
            </div>
          </section>

          <aside className="inspector" aria-label="Comparison details">
            <section className="summary">
              <h2>Difference summary</h2>
              <div className="percentage" aria-live="polite">
                <span className="percentage-dot" aria-hidden="true" />
                <strong>{comparison ? formatPercentage(comparison.stats.changed, comparison.stats.total) : '—'}</strong>
              </div>
              <div className="summary-label">Pixels changed</div>
              <dl>
                <div><dt>Changed pixels</dt><dd>{comparison ? numbers.format(comparison.stats.changed) : '—'}</dd></div>
                <div><dt>Total pixels</dt><dd>{comparison ? numbers.format(comparison.stats.total) : '—'}</dd></div>
                <div className="size-row"><dt>Before size</dt><dd><Size image={before} /></dd></div>
                <div><dt>After size</dt><dd><Size image={after} /></dd></div>
              </dl>
            </section>
            <section className="pairs">
              <div className="pair-heading"><h2>Screenshot pairs</h2><span>{pairs.length}</span></div>
              {pairs.length === 0 && <p>No matched pairs yet</p>}
              {pairs.length > 0 && <ul>
                {pairs.map((pair, i) => (
                  <li key={pair.name}>
                    <button
                      type="button"
                      aria-pressed={i === index}
                      title={`${pair.before.name} → ${pair.after.name}`}
                      onClick={() => { setIndex(i); setPosition(initialPosition) }}
                    >
                      <LuImages aria-hidden="true" /><span>{pair.name}</span><LuChevronRight aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>}
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}
