import { comparePixels } from './comparison.ts'
import type { Pair } from './pairing.ts'

export interface Screenshot {
  name: string
  image: HTMLImageElement
}

const maxPixels = 16_000_000
// Keep comparison canvases within the 4,096 × 4,096 budget of older iOS WebKit versions.
const maxAxis = 4096
const axisLimit = `${maxAxis.toLocaleString('en-US')} px per side`

function exceedsAxisLimit(width: number, height: number) {
  return width > maxAxis || height > maxAxis
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not create a canvas.')
  return { canvas, context }
}

async function loadImage(name: string, url: string): Promise<Screenshot> {
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch {
    throw new Error('could not be decoded')
  }

  const { naturalWidth: width, naturalHeight: height } = image
  if (exceedsAxisLimit(width, height)) {
    throw new Error(`exceeds the limit of ${axisLimit} (${width} × ${height} px)`)
  }
  if (width * height > maxPixels) {
    throw new Error('exceeds 16 megapixels')
  }
  return { name, image }
}

async function imageType(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  throw new Error('choose a PNG, JPEG, or WebP image')
}

export async function readFiles(files: File[]) {
  const screenshots: Screenshot[] = []
  const errors: string[] = []
  for (const file of files) {
    try {
      const type = await imageType(file)
      const url = URL.createObjectURL(file.slice(0, file.size, type))
      try {
        screenshots.push(await loadImage(file.name, url))
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      errors.push(`${file.name} — ${error instanceof Error ? error.message : 'could not be opened'}.`)
    }
  }
  return { screenshots, errors }
}

export async function loadExamples() {
  const names = ['overview.webp', 'activity.webp']
  const loadSide = (side: string) =>
    Promise.all(names.map((name) => loadImage(name, `${import.meta.env.BASE_URL}examples/${side}/${name}`)))

  const [before, after] = await Promise.all([loadSide('before'), loadSide('after')])
  return { before, after }
}

function readPixels(image: HTMLImageElement) {
  const { canvas, context } = makeCanvas(image.naturalWidth, image.naturalHeight)
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  canvas.width = 0
  return pixels
}

export function buildComparison(pair: Pair<Screenshot>) {
  const { image: before } = pair.before
  const { image: after } = pair.after
  const width = Math.max(before.naturalWidth, after.naturalWidth)
  const height = Math.max(before.naturalHeight, after.naturalHeight)
  if (exceedsAxisLimit(width, height)) {
    throw new Error(`The combined image bounds exceed the limit of ${axisLimit} (${width} × ${height} px).`)
  }
  if (width * height > maxPixels) {
    throw new Error('The combined image bounds exceed 16 megapixels.')
  }

  const { data, ...stats } = comparePixels(readPixels(before), readPixels(after))
  const { canvas: diff, context } = makeCanvas(width, height)
  const imageData = context.createImageData(width, height)
  imageData.data.set(data)
  context.putImageData(imageData, 0, 0)

  return { before, after, diff, stats }
}

export type Comparison = ReturnType<typeof buildComparison>

export function drawRaster(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  x: number,
  y: number,
  scale: number,
) {
  const width = image instanceof HTMLImageElement ? image.naturalWidth : image.width
  const height = image instanceof HTMLImageElement ? image.naturalHeight : image.height
  context.drawImage(image, x, y, width * scale, height * scale)
}
