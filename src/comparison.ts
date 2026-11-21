export interface Raster {
  width: number
  height: number
  data: Uint8ClampedArray
}

export function comparePixels(before: Raster, after: Raster) {
  const width = Math.max(before.width, after.width)
  const height = Math.max(before.height, after.height)
  const data = new Uint8ClampedArray(width * height * 4)
  let changed = 0
  let total = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inBefore = x < before.width && y < before.height
      const inAfter = x < after.width && y < after.height
      if (!inBefore && !inAfter) continue

      total++
      const output = (y * width + x) * 4
      const left = (y * before.width + x) * 4
      const right = (y * after.width + x) * 4
      const alpha = before.data[left + 3]
      const different = !inBefore || !inAfter || alpha !== after.data[right + 3]
        || (alpha !== 0 && (
          before.data[left] !== after.data[right]
          || before.data[left + 1] !== after.data[right + 1]
          || before.data[left + 2] !== after.data[right + 2]
        ))

      if (different) {
        changed++
        data[output] = 235
        data[output + 1] = 65
        data[output + 2] = 113
        data[output + 3] = 255
      } else {
        const luminance = 0.2126 * before.data[left] + 0.7152 * before.data[left + 1] + 0.0722 * before.data[left + 2]
        const shade = 43 + 0.64 * luminance
        data[output] = shade
        data[output + 1] = shade
        data[output + 2] = shade + 6
        data[output + 3] = alpha
      }
    }
  }

  return {
    width,
    height,
    data,
    changed,
    total,
    sizeMismatch: before.width !== after.width || before.height !== after.height,
  }
}

export function formatPercentage(changed: number, total: number) {
  const percent = total === 0 ? 0 : (changed / total) * 100
  return percent > 0 && percent < 0.01 ? '<0.01%' : `${percent.toFixed(2)}%`
}
