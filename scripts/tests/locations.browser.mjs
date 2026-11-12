// From the repository root, with the same BV_PLAYWRIGHT_PATH and BV_CHROMIUM_PATH as cta.browser.mjs.
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { build, preview } from 'vite'
import { OBJECTS, KIROV_LABEL } from '../../src/data/objects.js'
import { CARDS, formatPrice } from '../../src/data/calculator.js'
import { FAQ, plainAnswer } from '../../src/data/faq.js'
import { REGIONS } from '../../src/data/regions.js'

const { chromium } = await import(process.env.BV_PLAYWRIGHT_PATH || 'playwright-core')
const browser = await chromium.launch({ executablePath: process.env.BV_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const work = await mkdtemp(path.join(tmpdir(), 'bv-map-'))
const sizes = [[320,568], [360,740], [375,812], [390,844], [768,1024], [1024,768], [1280,720], [1440,900]]
const names = ['Сыктывкар', 'Печора', 'Ухта', 'Объячево']
const komi = REGIONS.syktyvkar
const coords = Object.fromEntries(OBJECTS.map(p => [p.name, [p.lon, p.lat]]))
const ukhta = [53.69141, 63.56904]
const fontCache = process.env.BV_FONT_CACHE
const fontUrls = fontCache ? (await readFile(path.join(fontCache, 'urls.txt'), 'utf8')).split('\n') : []
const output = process.env.BV_QA_OUTPUT

// Only the SDK boundary is simulated. The real loader, markers, controls, observers and React handlers run.
function installMaps() {
  class Entity {
    constructor(props, element) { this.props = props; this.element = element }
    addChild(child) { this.child = child; return this }
  }
  class Marker extends Entity {}
  class Controls extends Entity {}
  class Map {
    constructor(element, props) {
      this.props = props
      this.markers = []
      this.locations = []
      window.probe.maps.push(this)
    }
    addChild(child) {
      if (child instanceof Marker) this.markers.push(child)
      if (child instanceof Controls) this.controls = child
    }
    setLocation(value) { this.locations.push(value) }
    setBehaviors(value) { this.props.behaviors = value }
    destroy() {}
  }
  window.ymaps3 = {
    ready: Promise.resolve(), YMap: Map, YMapMarker: Marker, YMapControls: Controls,
    YMapDefaultSchemeLayer: Entity, YMapDefaultFeaturesLayer: Entity,
    import: async () => ({ YMapZoomControl: Entity }),
  }
}

const roundBounds = bounds => bounds.map(pair => pair.map(n => Number(n.toFixed(5))))
async function checkReady(page, regional, width) {
  const map = page.locator('#map')
  const reset = map.getByRole('button', { name: regional ? 'Показать Республику Коми' : 'Вся Кировская область' })
  await reset.waitFor()
  const formatLabel = name => regional && names.includes(name) ? name + ' — здесь установлена баня' :
    name === 'Киров и пригороды' ? KIROV_LABEL : name
  const state = await page.evaluate(() => {
    const [map] = window.probe.maps
    return {
      markers: map.markers.map(m => [m.element.getAttribute('aria-label'), m.props.coordinates]),
      loc: map.props.location, behaviors: map.props.behaviors, zoomControl: !!map.controls?.child,
    }
  })
  const expectedPlaces = regional ? { ...coords, Ухта: ukhta } : coords
  assert.deepEqual(state.markers, Object.entries(expectedPlaces).map(([name, pos]) => [formatLabel(name), pos]))
  assert.ok(state.zoomControl)
  assert.deepEqual(roundBounds(state.loc.bounds), regional ? [[49.295,65.499],[57.574,60.012]] : [[49.468,58.8511],[50.3697,57.44]])
  assert.deepEqual(state.behaviors, width < 1024 ? ['pinchZoom','dblClick'] : ['drag','dblClick'])
  if (width < 1024) {
    const hint = map.getByText('Нажмите, чтобы двигать карту')
    await hint.waitFor()
    const hintLayer = hint.locator('..').locator('..')
    await hintLayer.dispatchEvent('pointerdown', { clientX: 10, clientY: 20 })
    await hintLayer.dispatchEvent('pointercancel')
    assert.ok(await hint.isVisible())
    await hintLayer.tap({ position: { x: 60, y: 70 } })
    await hint.waitFor({ state: 'detached' })
    assert.deepEqual(await page.evaluate(() => window.probe.maps[0].props.behaviors), ['drag','pinchZoom','dblClick'])
  }
  const shortcuts = regional ? names : OBJECTS.filter(p => p.group === 'far').map(p => p.name)
  for (const [i, name] of shortcuts.entries()) {
    const button = map.getByRole('button', { name, exact: true })
    if (i === 0) await button.focus()
    else await page.keyboard.press('Tab')
    assert.ok(await button.evaluate(el => el === document.activeElement), name + ' keyboard order')
    await page.keyboard.press('Enter')
    const latest = await page.evaluate(() => window.probe.maps[0].locations.at(-1))
    assert.deepEqual(latest.center, expectedPlaces[name])
    assert.equal(latest.zoom, 9)
  }
  await page.keyboard.press('Tab')
  assert.ok(await reset.evaluate(el => el === document.activeElement))
  await page.keyboard.press('Space')
  const home = await page.evaluate(() => window.probe.maps[0].locations.at(-1))
  assert.deepEqual(roundBounds(home.bounds), regional ? roundBounds(state.loc.bounds) : [[48.9457,59.136],[51.976,56.171]])
  const pointName = regional ? 'Ухта' : 'Киров и пригороды'
  assert.ok(await page.evaluate(label => {
    const marker = window.probe.maps[0].markers.find(m => m.element.getAttribute('aria-label') === label)
    marker.props.onClick()
    return marker.element.classList.contains('is-open')
  }, formatLabel(pointName)))
  const probe = await page.evaluate(() => ({
    count: window.probe.maps.length, goals: window.probe.goals, tags: document.querySelectorAll('script[src*="api-maps.yandex.ru/v3/"]').length,
  }))
  assert.equal(probe.count, 1)
  assert.equal(probe.tags, 1)
  assert.equal(probe.goals.filter(g => g.goal === 'map_view').length, 1)
  assert.deepEqual(probe.goals.filter(g => g.goal === 'map_far_click').map(g => g.params.name), shortcuts)
  assert.deepEqual(probe.goals.filter(g => g.goal === 'map_point_click').map(g => g.params.name), [pointName])
  if (regional) {
    for (const name of names) {
      const button = map.getByRole('button', { name, exact: true })
      if (width < 1024) await button.tap()
      else await button.click()
      assert.deepEqual(await page.evaluate(() => window.probe.maps[0].locations.at(-1).center), expectedPlaces[name])
    }
  }
}

async function checkPage(page, regional, width) {
  const expectedSections = ['reviews', 'quiz', 'map', ...(regional ? ['delivery'] : []), 'calculator']
  assert.deepEqual(await page.locator('#reviews, #quiz, #map, #delivery, #calculator').evaluateAll(els => els.map(el => el.id)), expectedSections)
  if (regional) {
    const section = page.locator('#delivery')
    const headings = await section.locator('h3').allTextContents()
    assert.deepEqual(headings, ['Уточняем адрес','Согласовываем доставку','Изготавливаем баню','Привозим и устанавливаем'])
    const boxes = await section.locator('li').evaluateAll(els => els.map(el => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, fits: el.scrollWidth <= el.clientWidth }
    }))
    const cols = width < 768 ? 1 : width < 1280 ? 2 : 4
    for (const [i, b] of boxes.entries()) {
      assert.ok(b.fits && b.x >= 0 && b.right <= width)
      if (i >= cols) assert.ok(b.y >= boxes[i-cols].bottom + 16)
      if (i % cols) assert.ok(b.y === boxes[i-1].y && b.x >= boxes[i-1].right + 16)
    }
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex')
    assert.doesNotMatch(await page.locator('main').textContent(), /20\s*км|привезём к ней|ставим за один день/i)
    if (output && [320, 768, 1440].includes(width)) {
      await section.screenshot({ path: path.join(output, 'delivery-' + width + '.png') })
    }
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const faq = page.locator('#faq')
  const schema = JSON.parse(await faq.locator('script').textContent())
  for (const [i, item] of FAQ.entries()) {
    const override = regional ? komi.delivery.faqAnswers[item.n] : undefined
    assert.equal(schema.mainEntity[i].acceptedAnswer.text, override ?? plainAnswer(item))
    if (item.n === 7 || override) {
      const answer = faq.locator('details').nth(i)
      await answer.locator('summary').click()
      assert.equal(await answer.locator('div > p').first().innerText(), override ?? plainAnswer(item))
    }
  }
  const calc = page.locator('#calculator')
  for (const season of ['warm','year']) {
    if (season === 'year') await calc.getByRole('radio', { name: 'Круглый год, включая морозы' }).click()
    const cards = calc.getByRole('radiogroup', { name: 'Вариант бани' }).getByRole('radio')
    for (const [i, card] of CARDS[season].entries()) {
      const price = await cards.nth(i).getByText(formatPrice(card.price), { exact: true }).count()
      assert.equal(price, 1)
      assert.ok(await cards.nth(i).getByText(regional ? komi.delivery.cardNote : card.delivery, { exact: true }).isVisible())
    }
  }
}

async function visit(base, regional, size, mode) {
  const [width, height] = size
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1024, reducedMotion: 'reduce' })
  const errors = []
  let requests = 0
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    window.probe = { maps: [], goals: [], calcRequests: 0 }
    window.ym = (_, method, goal, params) => { if (method === 'reachGoal') window.probe.goals.push({goal, params}) }
    window.addEventListener('bv:calc', () => window.probe.calcRequests++)
  })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === base && url.pathname !== '/api/lead.php') return route.continue()
    if (url.hostname === 'api-maps.yandex.ru') {
      requests++
      if (mode === 'ready') return route.fulfill({ contentType: 'application/javascript', body: '(' + installMaps.toString() + ')()' })
    }
    if (fontCache && url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', path: path.join(fontCache, 'onest.css') })
    const i = fontUrls.indexOf(url.href)
    if (i >= 0) return route.fulfill({ contentType: 'font/ttf', path: path.join(fontCache, 'onest-' + i + '.font') })
    return route.abort()
  })
  try {
    await page.goto(base + (regional ? '/syktyvkar/' : '/'))
    const map = page.locator('#map')
    await page.locator('#top h1').waitFor()
    await page.evaluate(() => document.fonts.ready)
    assert.equal(requests, 0, 'lazy until map approaches')
    await map.scrollIntoViewIfNeeded()
    if (mode === 'ready') {
      await checkReady(page, regional, width)
      if (regional) {
        assert.ok(await map.locator('button').evaluateAll(els => els.every(el => {
          const b = el.getBoundingClientRect()
          return b.left >= 0 && b.right <= innerWidth && b.height >= 44
        })))
      }
      await checkPage(page, regional, width)
    } else {
      const cta = regional ? map.getByRole('link', { name: 'Уточнить условия доставки' }) : map.getByRole('button', { name: 'Рассчитать доставку' })
      await cta.waitFor()
      if (regional) assert.ok(await map.getByText(names.join(', ') + '.', { exact: true }).isVisible())
      await cta.focus()
      await page.keyboard.press('Enter')
      if (regional) assert.equal(new URL(page.url()).hash, '#final')
      assert.equal(await page.evaluate(() => window.probe.calcRequests), regional ? 0 : 1)
      assert.equal(await page.evaluate(() => window.probe.goals.filter(g => g.goal === 'map_fallback_cta').length), 1)
    }
    assert.equal(requests, mode === 'nokey' ? 0 : 1)
    assert.deepEqual(errors, [])
  } finally {
    await page.close()
  }
}

try {
  if (output) await mkdir(output, { recursive: true })
  for (const key of ['test-key', '']) {
    const outDir = path.join(work, key || 'nokey')
    await build({ logLevel: 'silent', define: { 'import.meta.env.VITE_YMAPS_KEY': JSON.stringify(key) }, build: { outDir } })
    const server = await preview({ logLevel: 'silent', build: { outDir }, preview: { host: '127.0.0.1', port: 0 } })
    const base = 'http://127.0.0.1:' + server.httpServer.address().port
    try {
      if (key) for (const size of sizes) {
        for (const regional of [false, true]) await visit(base, regional, size, 'ready')
        console.log(size.join('×') + ': both maps and delivery layouts passed')
      }
      for (const regional of [false, true]) await visit(base, regional, sizes[0], key ? 'failed' : 'nokey')
    } finally {
      await server.close()
    }
  }
  console.log('Regional logistics: 16 responsive cases and 4 fallback cases passed.')
} finally {
  await browser.close()
  await rm(work, { recursive: true, force: true })
}
