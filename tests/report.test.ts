import assert from 'node:assert/strict'
import test from 'node:test'
import { renderReport } from '../src/report.ts'

const pixel = 'data:image/png;base64,AA=='
const image = { name: 'home.png', width: 20, height: 10, src: pixel }
const stats = { changed: 50, total: 200, sizeMismatch: false }
const home = { name: 'home', before: image, after: image, diff: pixel, stats }

test('renders each pair with three embedded images and its own statistics', () => {
  const report = renderReport([
    home,
    { ...home, name: 'settings', stats: { ...stats, changed: 200, sizeMismatch: true } },
  ])
  assert.equal(report.match(/<article>/g)?.length, 2)
  assert.equal(report.match(/src="data:image\/png;base64,AA=="/g)?.length, 6)
  assert.match(report, /<h2>settings<\/h2>/)
  assert.match(report, /25\.00%/)
  assert.match(report, /100\.00%/)
  assert.match(report, /Image sizes differ/)
  assert.match(report, /2 screenshot pairs/)
})

test('escapes pair names, filenames, and error messages as plain text', () => {
  const name = '<script>alert("name & file")</script>'
  const report = renderReport([
    { ...home, name, before: { ...image, name } },
    { name, error: '<b>Invalid</b>' },
  ])
  assert.doesNotMatch(report, /<script>|<b>Invalid<\/b>/)
  assert.match(report, /&lt;script&gt;alert\(&quot;name &amp; file&quot;\)&lt;\/script&gt;/)
  assert.match(report, /&lt;b&gt;Invalid&lt;\/b&gt;/)
  assert.match(report, /default-src 'none'/)
})
