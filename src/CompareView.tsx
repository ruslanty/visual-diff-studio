import { useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { LuChevronsLeftRight, LuColumns2, LuScanLine } from 'react-icons/lu'
import type { Comparison } from './screenshots.ts'
import { drawRaster } from './screenshots.ts'

const modes = [
  { id: 'slider', label: 'Slider', icon: LuChevronsLeftRight },
  { id: 'side-by-side', label: 'Side by side', icon: LuColumns2 },
  { id: 'diff', label: 'Pixel diff', icon: LuScanLine },
] as const

export type Mode = typeof modes[number]['id']

export function ViewControls({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className="view-controls" role="group" aria-label="Comparison view">
      {modes.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => onChange(id)}>
          <Icon aria-hidden="true" />{label}
        </button>
      ))}
    </div>
  )
}

function Preview({
  width, height, source, label, style,
}: {
  width: number
  height: number
  source: HTMLImageElement | HTMLCanvasElement
  label: string
  style?: CSSProperties
}) {
  const target = useRef<HTMLCanvasElement>(null)
  const scale = Math.min(1, 1600 / Math.max(width, height))
  const renderWidth = Math.max(1, Math.ceil(width * scale))
  const renderHeight = Math.max(1, Math.ceil(height * scale))

  useEffect(() => {
    const context = target.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, renderWidth, renderHeight)
    drawRaster(context, source, 0, 0, scale)
  }, [source, renderWidth, renderHeight, scale])

  return <canvas ref={target} width={renderWidth} height={renderHeight} role="img" aria-label={label} style={style} />
}

function Frame({ width, height, children }: { width: number; height: number; children: ReactNode }) {
  return (
    <div className="frame" style={{
      aspectRatio: `${width} / ${height}`,
      maxWidth: `${530 * width / height}px`,
    }}>{children}</div>
  )
}

export function CompareView({
  comparison, mode, position, onSlide,
}: {
  comparison: Comparison
  mode: Mode
  position: number
  onSlide: (position: number) => void
}) {
  const { before, after, diff, stats: { width, height } } = comparison
  const preview = { width, height }

  if (mode === 'side-by-side') {
    return (
      <div className="frames side-by-side">
        <Frame {...preview}>
          <Preview {...preview} source={before} label="Before screenshot" />
          <span className="frame-label before">Before</span>
        </Frame>
        <Frame {...preview}>
          <Preview {...preview} source={after} label="After screenshot" />
          <span className="frame-label after">After</span>
        </Frame>
      </div>
    )
  }

  if (mode === 'diff') {
    return (
      <div className="frames">
        <Frame {...preview}>
          <Preview {...preview} source={diff} label="Changed pixels highlighted in pink" />
          <span className="frame-label diff">Pixel diff</span>
        </Frame>
      </div>
    )
  }

  return (
    <div className="frames">
      <Frame {...preview}>
        <Preview {...preview} source={after} label="After screenshot" style={{
          clipPath: `inset(0 0 0 ${position}%)`,
        }} />
        <Preview {...preview} source={before} label="Before screenshot" style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }} />
        {position >= 12 && <span className="frame-label before">Before</span>}
        {position <= 88 && <span className="frame-label after">After</span>}
        <div className="slider-divider" style={{ left: `${position}%` }} aria-hidden="true">
          <span><LuChevronsLeftRight /></span>
        </div>
        <input
          className="slider-input"
          type="range"
          min="0"
          max="100"
          value={position}
          aria-label="Before and after split"
          aria-valuetext={`${position}% before, ${100 - position}% after`}
          onChange={(event) => onSlide(event.currentTarget.valueAsNumber)}
        />
      </Frame>
    </div>
  )
}
