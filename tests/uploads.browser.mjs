import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import { crc32, deflateSync } from 'node:zlib'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const black = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4nGNgYGD4D8IABgMB/8+HxnAAAAAASUVORK5CYII=', 'base64')
const halfChanged = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAADklEQVR4nGNgYGD4DwIADvoE/EWwHYsAAAAASUVORK5CYII=', 'base64')
const corrupt = Buffer.from('iVBORw0KGgpicm9rZW4=', 'base64')

let server
let browser

before(async () => {
  server = await preview({ preview: { host: '127.0.0.1', port: 0 } })
  browser = await chromium.launch({ channel: 'chrome' })
})

after(async () => {
  try {
    await browser?.close()
  } finally {
    await server?.close()
  }
})

function png(name, buffer = black) {
  return { name, mimeType: 'image/png', buffer }
}

// Encode fixtures without Canvas so oversized images reach the app at their actual dimensions.
function solidPng(name, width, height, gray) {
  function chunk(type, data) {
    const payload = Buffer.concat([Buffer.from(type), data])
    const length = Buffer.alloc(4)
    const checksum = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    checksum.writeUInt32BE(crc32(payload))
    return Buffer.concat([length, payload, checksum])
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // 8-bit grayscale
  const row = Buffer.alloc(width + 1, gray)
  row[0] = 0 // No row filter
  const pixels = Buffer.alloc(row.length * height, row)
  return png(name, Buffer.concat([
    black.subarray(0, 8), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]))
}

async function openStudio(t) {
  const page = await browser.newPage()
  t.after(() => page.close())
  page.setDefaultTimeout(5000)
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`)
  return page
}

async function upload(page, side, ...files) {
  await page.getByLabel(`Upload ${side} screenshots`).setInputFiles(files)
  await page.locator(`.upload-zone.${side} .browse-button:enabled`).waitFor()
}

test('a damaged file cannot turn a batch into a pair of unrelated filenames', async (t) => {
  const page = await openStudio(t)
  await upload(page, 'before', png('Target.png', corrupt), png('Unrelated.png'))
  await upload(page, 'after', png('Target.png'))

  await page.getByText('Target.png — could not be decoded.').waitFor()
  assert.equal(await page.getByTitle('Unrelated.png → Target.png').count(), 0)
  await page.getByText('No matched pairs yet').waitFor()
  assert.ok(await page.getByRole('button', { name: 'Export PNG' }).isDisabled())
  assert.ok(await page.getByRole('button', { name: 'HTML report' }).isDisabled())
  await page.getByText('2 unmatched files').click()
  await page.getByText('Before · Unrelated.png').waitFor()
  await page.getByText('After · Target.png').waitFor()
})

test('a damaged replacement clears the old pair and exports recover after a valid replacement', async (t) => {
  const page = await openStudio(t)
  const exportPng = page.getByRole('button', { name: 'Export PNG' })
  const exportHtml = page.getByRole('button', { name: 'HTML report' })
  const comparison = page.getByRole('region', { name: 'Comparison' })

  await upload(page, 'before', png('old-before.png'))
  await upload(page, 'after', png('old-after.png', halfChanged))
  await comparison.getByTitle('old-before.png → old-after.png').waitFor()
  await page.getByText('50.00%').waitFor()
  assert.ok(await exportPng.isEnabled())
  assert.ok(await exportHtml.isEnabled())

  await upload(page, 'after', png('new-after.png', corrupt))
  const error = page.getByText('new-after.png — could not be decoded.')
  await error.waitFor()
  assert.ok(await exportPng.isDisabled(), 'PNG export still uses the old pair')
  assert.ok(await exportHtml.isDisabled(), 'HTML export still uses the old pair')
  await page.getByText('No matched pairs yet').waitFor()
  assert.equal(await page.getByText('old-after.png', { exact: true }).count(), 0)

  await upload(page, 'after', png('new-after.png'))
  await comparison.getByTitle('old-before.png → new-after.png').waitFor()
  await page.getByText('0.00%').waitFor()
  assert.equal(await error.count(), 0)
  assert.ok(await exportPng.isEnabled())
  const downloaded = page.waitForEvent('download')
  await exportHtml.click()
  const html = await readFile(await (await downloaded).path(), 'utf8')
  assert.match(html, /new-after\.png/)
  assert.doesNotMatch(html, /old-after\.png/)
})

for (const [width, height] of [[1, 70000], [4097, 1]]) {
  test(`rejects black and white ${width} × ${height} PNGs before comparison and export`, async (t) => {
    const page = await openStudio(t)
    await upload(page, 'before', solidPng('black.png', width, height, 0))
    await upload(page, 'after', solidPng('white.png', width, height, 255))

    const errors = page.getByRole('alert')
    await errors.getByText(/black\.png.*4,096 px/).waitFor()
    await errors.getByText(/white\.png.*4,096 px/).waitFor()
    await page.getByText('No matched pairs yet').waitFor()
    assert.equal(await page.locator('.percentage strong').innerText(), '—')
    assert.ok(await page.getByRole('button', { name: 'Export PNG' }).isDisabled())
    assert.ok(await page.getByRole('button', { name: 'HTML report' }).isDisabled())
  })
}

test('compares black and white PNGs at the 4,096 px limit', async (t) => {
  const page = await openStudio(t)
  await upload(page, 'before', solidPng('black.png', 1, 4096, 0))
  await upload(page, 'after', solidPng('white.png', 1, 4096, 255))

  await page.getByText('100.00%', { exact: true }).waitFor()
  assert.deepEqual(await page.locator('.summary dl dd').allTextContents(), ['4,096', '4,096', '1 × 4096', '1 × 4096'])
  assert.ok(await page.getByRole('button', { name: 'Export PNG' }).isEnabled())
  assert.ok(await page.getByRole('button', { name: 'HTML report' }).isEnabled())
})
