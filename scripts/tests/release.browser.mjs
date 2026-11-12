// Check the physical multi-page build, without a SPA fallback or real lead requests.
// BV_QA_OUTPUT saves the two pages in consecutive sections at four reference sizes.
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { preview } from 'vite'
const { chromium } = await import(process.env.BV_PLAYWRIGHT_PATH || 'playwright-core')
const server = await preview({ appType: 'mpa', logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } })
const base = 'http://127.0.0.1:' + server.httpServer.address().port
const browser = await chromium.launch({ executablePath: process.env.BV_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const sizes = [[320,568],[360,740],[374,812],[375,812],[390,844],[599,800],[600,800],[767,1024],
  [768,1024],[1023,768],[1024,768],[1279,720],[1280,720],[1440,900]]
const fontCache = process.env.BV_FONT_CACHE
const fonts = fontCache ? (await readFile(path.join(fontCache, 'urls.txt'), 'utf8')).trim().split('\n') : []
const output = process.env.BV_QA_OUTPUT

async function newPage(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.origin === base && route.request().method() === 'GET' && !url.pathname.startsWith('/api/')) return route.continue()
    if (fontCache && url.hostname === 'fonts.googleapis.com') return route.fulfill({ path: path.join(fontCache, 'onest.css'), contentType: 'text/css' })
    const index = fonts.indexOf(url.href)
    if (index >= 0) return route.fulfill({ path: path.join(fontCache, 'onest-' + index + '.font'), contentType: 'font/ttf' })
    return route.abort()
  })
  return page
}

async function checkRoutes() {
  const page = await newPage(1024, 768)
  for (const route of ['/', '/syktyvkar/', '/syktyvkar/index.html', '/privacy/']) {
    const privacy = route === '/privacy/'
    const regional = route.startsWith('/syktyvkar/')
    const url = base + route + '?utm_source=acceptance' + (privacy ? '' : '#faq')
    for (const response of [await page.goto(url), await page.reload()]) assert.equal(response.status(), 200)
    await page.locator('h1').waitFor()
    assert.equal(await page.locator('html').getAttribute('lang'), 'ru')
    assert.equal(await page.locator('h1').count(), 1)
    assert.equal(page.url(), url)
    if (privacy) continue
    const canonical = 'https://banivyatki.ru/' + (regional ? 'syktyvkar/' : '')
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), canonical)
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), canonical)
    assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), await page.title())
    for (const attr of ['name="description"','property="og:description"']) {
      const description = await page.locator('meta[' + attr + ']').getAttribute('content')
      assert.ok(description.length > 20 && (regional ? /Коми/.test(description) : !/Коми/.test(description)))
    }
    assert.equal(await page.locator('meta[name=robots][content=noindex]').count(), regional ? 1 : 0)
    for (const asset of ['link[rel=icon]','meta[property="og:image"]']) {
      const value = await page.locator(asset).getAttribute(asset.startsWith('link') ? 'href' : 'content')
      assert.equal((await page.request.get(base + new URL(value, base).pathname)).status(), 200)
    }
    assert.equal(await page.locator('script[src*="cdn.callibri.ru/callibri.js"]').count(), 1)
    assert.equal(await page.locator('script[src*="mc.yandex.ru/metrika/tag.js"]').count(), 1)
    assert.equal(await page.evaluate(() => Array.from(window.ym.a ?? []).filter(item => item[0] === 113423850 && item[1] === 'init').length), 1)
    const broken = await page.locator('a[href^="#"]').evaluateAll(links => links.map(a => a.hash.slice(1)).filter(id => id && !document.getElementById(decodeURIComponent(id))))
    assert.deepEqual(broken, [])
  }
  assert.equal((await page.request.get(base + '/missing-acceptance-page/')).status(), 404)
  await page.close()
  console.log('Four physical routes, reloads, UTM, anchors, metadata and per-page integrations passed.')
}

async function checkLayout(width, height, regional) {
  const page = await newPage(width, height)
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  const route = regional ? '/syktyvkar/' : '/'
  await page.goto(base + route)
  await page.locator('footer').waitFor()
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].filter(img => img.closest('#root')).map(img => {
      img.loading = 'eager'
      return img.decode()
    }))
  })
  const parts = page.locator('main > section, footer')
  const count = await parts.count()
  assert.equal(count, regional ? 16 : 15)
  const outputDir = output && [320,390,768,1440].includes(width) && path.join(output, (regional ? 'syktyvkar-' : 'kirov-') + width)
  if (outputDir) {
    await mkdir(outputDir, { recursive: true })
    await page.screenshot({ path: path.join(outputDir, '00-first-screen.jpg'), quality: 83 })
  }
  let bottom = 0
  for (const [i, section] of (await parts.all()).entries()) {
    const metrics = await section.evaluate(el => {
      const b = el.getBoundingClientRect()
      return { x: b.x, right: b.right, y: b.y + scrollY, bottom: b.bottom + scrollY,
        name: el.id || el.getAttribute('aria-labelledby') || (el.querySelector('#map') ? 'map' : el.tagName.toLowerCase()),
        clipped: el.scrollWidth > el.clientWidth + 1 }
    })
    assert.ok(metrics.x >= -1 && metrics.right <= width + 1 && !metrics.clipped && metrics.y >= bottom - 1,
      route + ' ' + width + ' ' + JSON.stringify(metrics))
    bottom = metrics.bottom
    if (outputDir) {
      await section.screenshot({ path: path.join(outputDir, String(i + 1).padStart(2, '0') + '-' + metrics.name + '.jpg'),
        quality: 80, animations: 'disabled', timeout: 30000 })
    }
  }
  const plans = page.locator('#catalog').getByRole('button', { name: /^Планировка —/ })
  assert.equal(await plans.count(), 3)
  for (const plan of await plans.all()) {
    await plan.focus()
    await page.keyboard.press('Enter')
    const dialog = page.locator('dialog[open]')
    await dialog.locator('img').evaluate(image => image.decode())
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'detached' })
    assert.ok(await plan.evaluate(el => el === document.activeElement))
  }
  if (outputDir && regional) {
    const faq = page.locator('#faq details').nth(13)
    await faq.locator('summary').click()
    await faq.screenshot({ path: path.join(outputDir, 'faq-warranty-open.jpg'), quality: 85 })
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  assert.deepEqual(errors, [])
  await page.close()
}
try {
  await checkRoutes()
  for (const [width, height] of sizes) {
    for (const regional of [false, true]) await checkLayout(width, height, regional)
    console.log(width + '×' + height + ' both full pages passed')
  }
} finally {
  await browser.close()
  await server.close()
}
