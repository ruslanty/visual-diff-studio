import { useRef, useState } from 'react'
import { LuImagePlus, LuUpload } from 'react-icons/lu'
import type { Side } from './pairing.ts'
import type { Screenshot } from './screenshots.ts'

export const sideLabels = { before: 'Before', after: 'After' } as const

export function UploadZone({
  side, files, busy, onFiles,
}: {
  side: Side
  files: Screenshot[]
  busy: boolean
  onFiles: (files: File[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const sideLabel = sideLabels[side]
  const description = files.length === 1 ? files[0].name : `${files.length} screenshots selected`

  return (
    <div
      className={`upload-zone ${side}${dragging ? ' dragging' : ''}`}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        event.preventDefault()
        event.dataTransfer.dropEffect = busy ? 'none' : 'copy'
        setDragging(!busy)
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
          setDragging(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!busy && event.dataTransfer.files.length) onFiles(Array.from(event.dataTransfer.files))
      }}
    >
      <span className="upload-icon"><LuImagePlus aria-hidden="true" /></span>
      <div className="upload-copy">
        <h2>{sideLabel}</h2>
        <p title={files.length ? description : undefined}>{files.length ? description : 'Drop screenshots here'}</p>
      </div>
      <input
        ref={input}
        aria-label={`Upload ${side} screenshots`}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        hidden
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? [])
          event.currentTarget.value = ''
          if (files.length) onFiles(files)
        }}
      />
      <button className="button browse-button" type="button" disabled={busy} onClick={() => input.current?.click()} aria-label={`Browse ${side} files`}>
        <LuUpload aria-hidden="true" />{busy ? 'Opening…' : 'Browse'}
      </button>
    </div>
  )
}
