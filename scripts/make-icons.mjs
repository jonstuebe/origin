// Renders the PWA icons from public/favicon.svg with the bundled Playwright Chromium.
// Usage: npm run icons
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

// Any Playwright install works; it is not a project dependency.
const { chromium } = createRequire(import.meta.url)('playwright')

const root = new URL('../public/', import.meta.url)
const outDir = new URL('icons/', root)
await mkdir(outDir, { recursive: true })

const favicon = await readFile(new URL('favicon.svg', root), 'utf8')
// Maskable icons and iOS apply their own rounded mask, so drop the corner radius.
const fullBleed = favicon.replace('rx="112" ', '')
// Keep the maskable artwork inside the central safe zone.
const maskable = fullBleed.replace(
  /<g id="art">([\s\S]*?)<\/g>/,
  (_, inner) =>
    `<g transform="translate(256 256) scale(0.74) translate(-256 -256)">${inner}</g>`,
)

const targets = [
  { file: 'icon-192.png', size: 192, svg: favicon },
  { file: 'icon-512.png', size: 512, svg: favicon },
  { file: 'icon-maskable-512.png', size: 512, svg: maskable },
  { file: 'apple-touch-icon.png', size: 180, svg: fullBleed },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size, svg } of targets) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`,
  )
  await page
    .locator('svg')
    .screenshot({ path: new URL(file, outDir).pathname, omitBackground: true })
  console.log('wrote', file)
}
await browser.close()
