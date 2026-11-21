import assert from 'node:assert/strict'
import test from 'node:test'
import { comparePixels, formatPercentage } from '../src/comparison.ts'

const black = [0, 0, 0, 255]
const white = [255, 255, 255, 255]
const changed = [235, 65, 113, 255]

function raster(width: number, height: number, ...pixels: number[][]) {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) }
}

test('counts changed pixels and marks them in the diff', () => {
  const result = comparePixels(raster(2, 1, black, white), raster(2, 1, black, black))
  assert.equal(result.changed, 1)
  assert.equal(result.total, 2)
  assert.deepEqual([...result.data.slice(4)], changed)
  assert.equal(result.sizeMismatch, false)
})

test('reports no changes for identical images', () => {
  const before = raster(1, 1, white)
  const result = comparePixels(before, before)
  assert.equal(result.changed, 0)
  assert.equal(result.total, 1)
})

test('counts pixels outside the overlap without counting unoccupied corners', () => {
  const result = comparePixels(raster(2, 1, black, black), raster(1, 2, black, black))
  assert.equal(result.sizeMismatch, true)
  assert.deepEqual([result.width, result.height, result.changed, result.total], [2, 2, 2, 3])
  assert.deepEqual([...result.data.slice(4, 12)], [...changed, ...changed])
  assert.equal(result.data[15], 0)
})

test('ignores hidden colors but counts differences in alpha', () => {
  const before = raster(2, 1, [255, 0, 0, 0], [255, 255, 255, 100])
  const after = raster(2, 1, [0, 0, 255, 0], [255, 255, 255, 101])
  const result = comparePixels(before, after)
  assert.equal(result.changed, 1)
  assert.equal(result.data[3], 0)
})

test('reports tiny non-zero changes without rounding them to zero', () => {
  assert.equal(formatPercentage(0, 100), '0.00%')
  assert.equal(formatPercentage(1, 3), '33.33%')
  assert.equal(formatPercentage(1, 100_000), '<0.01%')
})
