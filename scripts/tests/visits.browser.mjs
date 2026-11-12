// Test a local production build. Browser and font settings are shared with cta.browser.mjs.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { preview } from 'vite'
import { REGIONS } from '../../src/data/regions.js'
import { VISIT_CARDS } from '../../src/data/visit.js'
const { chromium } = await import(process.env.BV_PLAYWRIGHT_PATH || 'playwright-core')
const server = await preview({ logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } })
const base = 'http://127.0.0.1:' + server.httpServer.address().port
const browser = await chromium.launch({ executablePath: process.env.BV_CHROMIUM_PATH, args: ['--no-sandbox','--disable-dev-shm-usage'] })
const sizes = [[320,568],[360,740],[374,812],[375,812],[390,844],[768,1024],[1024,768],[1280,720],[1440,900]]
const labels = { video: 'Видеозвонок', production: 'Производство', showroom: 'Шоурум' }
const routes = ['/', '/syktyvkar/']
const utm = { utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'visit-test', utm_content: 'video', utm_term: 'баня' }
const search = '?' + new URLSearchParams(utm)
const fontCache = process.env.BV_FONT_CACHE
const fontUrls = fontCache ? (await readFile(path.join(fontCache, 'urls.txt'), 'utf8')).split('\n') : []

async function fixture([width, height], motion = 'reduce') {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: motion, hasTouch: width < 1024 })
  const io = { requests: [], errors: [], status: 200, gate: null }
  page.on('pageerror', err => io.errors.push(err.message))
  await page.addInitScript(() => {
    window.visitGoals = []
    window.ym = (id, method, name, params) => { if (method === 'reachGoal') window.visitGoals.push({ id, name, params }) }
    const start = Date.now()
    window.elapsed = 0
    Date.now = () => start + window.elapsed
    window.visitScrolls = []
    const scroll = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function(options) {
      if (this.id === 'visit-form') window.visitScrolls.push(options)
      return scroll.call(this, options)
    }
  })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === base) {
      if (url.pathname !== '/api/lead.php') return route.continue()
      assert.equal(route.request().method(), 'POST')
      io.requests.push(route.request().postDataJSON())
      if (io.gate) await io.gate
      return route.fulfill({ status: io.status, contentType: 'application/json', body: JSON.stringify({ ok: io.status === 200 }) })
    }
    if (url.hostname === 'fonts.googleapis.com' && fontCache) return route.fulfill({ path: path.join(fontCache, 'onest.css'), contentType: 'text/css' })
    const index = fontUrls.indexOf(url.href)
    if (index >= 0) return route.fulfill({ path: path.join(fontCache, 'onest-' + index + '.font'), contentType: 'font/ttf' })
    return route.abort()
  })
  return { page, io }
}

const form = page => page.locator('#visit-form')
const methods = page => form(page).getByRole('radiogroup', { name: 'Способ показа' })
const cardButton = (page, id) => page.locator('#showroom article[aria-labelledby="visit-' + id + '-title"] button')
const selected = async (page, id) => assert.equal(await methods(page).getByRole('radio', { checked: true }).innerText(), labels[id])
const goals = (page, name) => page.evaluate(goal => window.visitGoals.filter(g => g.name === goal), name)
const komi = REGIONS.syktyvkar
async function go(page, pathname) {
  await page.goto(base + pathname + search)
  await form(page).waitFor({ state: 'attached' })
  await page.evaluate(() => document.fonts.ready)
}

async function openFrom(page, link, id, goal, regional, smooth = false) {
  const before = await goals(page, 'visit_button')
  const scrolls = await page.evaluate(() => window.visitScrolls.length)
  await link.focus()
  await page.keyboard.press('Enter')
  await selected(page, id)
  const after = await goals(page, 'visit_button')
  assert.equal(after.length, before.length + 1)
  assert.deepEqual(after.at(-1), { id: 113423850, name: 'visit_button', params: { type: goal } })
  const actions = await page.evaluate(() => window.visitScrolls)
  assert.equal(actions.length, scrolls + 1)
  assert.deepEqual(actions.at(-1), { behavior: smooth ? 'smooth' : 'auto', block: 'start' })
  await page.waitForFunction(() => Math.abs(document.querySelector('#visit-form').getBoundingClientRect().top - 24) <= 2)
  if (regional) assert.equal(await page.evaluate(() => document.activeElement.id), 'visit-form')
}

async function checkLayout({ page, io }, pathname, width) {
  await go(page, pathname)
  const regional = pathname !== '/'
  const order = regional ? ['video','production','showroom'] : ['showroom','production','video']
  const data = regional ? komi.visit.cards : VISIT_CARDS
  const articles = page.locator('#showroom article')
  assert.deepEqual(await articles.locator('h3').allTextContents(), data.map(c => c.title))
  assert.deepEqual(await articles.evaluateAll(els => els.map(el => el.getAttribute('aria-labelledby'))), order.map(id => 'visit-' + id + '-title'))
  assert.deepEqual(await methods(page).getByRole('radio').allTextContents(), order.map(id => labels[id]))
  assert.equal(await form(page).locator('form').count(), 1)
  await selected(page, order[0])
  const section = form(page)
  assert.equal(await section.locator('h3').innerText(), regional ? 'Запишитесь на показ бани' : 'Запишитесь на показ')
  if (regional) assert.equal(await section.locator('h3 + p').innerText(), komi.visit.formDescription)
  await cardButton(page, order[0]).focus()
  for (const id of order.slice(1)) {
    await page.keyboard.press('Tab')
    assert.ok(await cardButton(page, id).evaluate(el => el === document.activeElement))
  }
  await page.keyboard.press('Tab')
  assert.ok(await methods(page).getByRole('radio').first().evaluate(el => el === document.activeElement))
  let previousBottom = 0
  for (const [i, id] of order.entries()) {
    const card = articles.nth(i)
    const box = await card.evaluate(el => {
      const rect = el.getBoundingClientRect()
      return { x: rect.x, y: rect.y + scrollY, width: rect.width, height: rect.height }
    })
    assert.ok(box.y >= previousBottom && box.x >= 0 && box.x + box.width <= width, pathname + id + " at " + width)
    previousBottom = box.y + box.height
    const photos = card.locator('img')
    assert.equal(await photos.count(), 1 + (id === 'production' ? 5 : id === 'showroom' ? 4 : 0))
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded()
      await photo.evaluate(img => img.decode())
      assert.ok(await photo.evaluate(img => img.naturalWidth > 0 && img.alt.length > 0))
    }
    if (width >= 1024 && regional) {
      const videoWidth = (await articles.first().locator('img').first().boundingBox()).width
      assert.equal((await photos.first().boundingBox()).width, videoWidth, 'video uses the same full-size columns as the other cards')
    }
    await openFrom(page, cardButton(page, id), id, id, regional)
  }
  const last = await articles.last().boundingBox()
  assert.ok((await section.boundingBox()).y >= last.y + last.height)
  await section.getByRole('textbox', { name: 'Имя' }).fill('Анна')
  await section.locator('[type=tel]').fill('+79991234567')
  const phone = await section.locator('[type=tel]').inputValue()
  for (const id of order) {
    const radio = methods(page).getByRole('radio', { name: labels[id] })
    await radio.focus()
    await page.keyboard.press('Space')
    await selected(page, id)
    assert.equal(await section.getByRole('textbox', { name: 'Имя' }).inputValue(), 'Анна')
    assert.equal(await section.locator('[type=tel]').inputValue(), phone)
  }
  const inside = page.locator('section[aria-labelledby=inside-title] a').last()
  if (regional) {
    assert.equal(await inside.innerText(), 'Записаться на видеопоказ')
    await methods(page).getByText('Шоурум').click()
    await openFrom(page, inside, 'video', 'video', true)
    await page.keyboard.press('Tab')
    assert.ok(await methods(page).getByText('Видеозвонок').evaluate(el => el === document.activeElement))
  } else {
    assert.equal(await inside.innerText(), 'Посмотреть баню вживую')
    await inside.click()
    assert.equal(new URL(page.url()).hash, '#showroom')
  }
  const faq = page.locator('#faq details').nth(16)
  await faq.locator('summary').click()
  const visible = await faq.locator('p').first().innerText()
  const schema = JSON.parse(await page.locator('#faq script').textContent())
  assert.equal(schema.mainEntity[16].acceptedAnswer.text, visible)
  assert.ok(visible.includes(regional ? 'Для покупателей из Республики Коми' : 'Готовые бани стоят в шоуруме'))
  assert.equal(await faq.locator('a').getAttribute('href'), '#visit-form')
  await methods(page).getByText('Производство').click()
  await openFrom(page, faq.locator('a'), order[0], 'faq', regional)
  assert.deepEqual((await goals(page, 'faq_open')).map(g => g.params.question), [17])
  const steps = page.locator('#process ol > li')
  assert.equal(await steps.count(), 5)
  if (regional) {
    for (const [i, step] of komi.process.steps.entries()) {
      const text = await steps.nth(i).innerText()
      for (const part of [step.title, step.term, step.we, step.you ?? 'Мы всё сделаем сами']) assert.ok(text.includes(part))
    }
    assert.equal(await page.locator('#delivery').count(), 1)
    assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex')
  }
  await page.locator('#process').getByRole('link', { name: 'Рассчитать стоимость' }).click()
  assert.equal(new URL(page.url()).hash, '#calculator')
  assert.equal((await goals(page, 'process_cta_click')).length, 1)
  assert.ok(await page.locator('#calculator').getByText(regional ? 'от 363 000 ₽' : 'от 293 000 ₽', { exact: true }).isVisible())
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  const textBoxes = await methods(page).getByRole('radio').evaluateAll(radios => radios.map(el => {
    const text = document.createRange()
    text.selectNodeContents(el)
    const { left, right, top, bottom } = text.getBoundingClientRect()
    return { left, right, top, bottom, h: el.clientHeight, label: el.textContent, x: el.getBoundingClientRect().x, w: el.clientWidth }
  }))
  for (const [i, box] of textBoxes.entries()) {
    assert.ok(box.left >= 0 && box.right <= width)
    assert.ok(box.left >= box.x && box.right <= box.x + box.w, JSON.stringify(textBoxes))
    if (width <= 374) {
      assert.ok(box.h >= 44 && (i === 0 || textBoxes[i - 1].bottom < box.top))
    } else if (i > 0) {
      assert.ok(textBoxes[i - 1].right < box.left && Math.abs(textBoxes[i - 1].top - box.top) < 2)
    }
  }
  assert.equal(io.requests.length, 0)
}

async function checkPost({ page, io }, pathname, id) {
  await go(page, pathname)
  await cardButton(page, id).click()
  const section = form(page)
  await section.getByRole('textbox', { name: 'Имя' }).fill(' Анна ')
  await section.locator('[type=tel]').fill('+79991234567')
  await section.getByRole('radio', { name: 'MAX' }).click()
  await section.getByRole('checkbox').check()
  await page.evaluate(() => { window.elapsed = 4000 })
  const button = section.getByRole('button', { name: 'Записаться', exact: true })
  const before = io.requests.length
  let release
  io.gate = new Promise(resolve => { release = resolve })
  try {
    await button.click()
    await section.getByRole('button', { name: 'Отправляем…', disabled: true }).waitFor()
    await section.locator('form').evaluate(el => el.requestSubmit())
    assert.equal((await goals(page, 'visit_submit')).length, 0)
  } finally { release(); io.gate = null }
  await section.getByRole('status').waitFor()
  assert.equal(io.requests.length, before + 1)
  const payload = io.requests.at(-1)
  for (const [key, value] of Object.entries({ form: 'visit', visit_type: id, phone: '+79991234567', name: 'Анна', contact_method: 'max', page_url: page.url(), ...utm, website: '' })) assert.equal(payload[key], value)
  assert.ok(payload.elapsed_ms >= 3000 && Number.isFinite(Date.parse(payload.submitted_at)))
  assert.deepEqual(await goals(page, 'visit_submit'), [{ id: 113423850, name: 'visit_submit', params: { type: id } }])
}

async function checkErrors({ page, io }) {
  const pathname = '/syktyvkar/'
  await go(page, pathname)
  const section = form(page), button = section.getByRole('button', { name: 'Записаться', exact: true })
  const start = io.requests.length
  await button.click()
  assert.ok(await section.getByText('Введите номер полностью').isVisible())
  assert.ok(await section.getByText('Нужно согласие на обработку данных').isVisible())
  await section.locator('[type=tel]').fill('+79991234567')
  await button.click()
  assert.equal(io.requests.length, start)
  await section.getByRole('checkbox').check()
  await page.evaluate(() => { window.elapsed = 5000 })
  io.status = 500
  await button.click()
  await section.getByRole('alert').waitFor()
  assert.equal((await goals(page, 'visit_submit')).length, 0)
  assert.equal(io.requests.length, start + 1)
  io.status = 200
  await button.click()
  await section.getByRole('status').waitFor()
  assert.equal(io.requests.length, start + 2)
  assert.equal((await goals(page, 'visit_submit')).length, 1)
  for (const trap of [false, true]) {
    await go(page, pathname)
    await section.locator('[type=tel]').fill('+79991234567')
    await section.getByRole('checkbox').check()
    if (trap) {
      await page.evaluate(() => { window.elapsed = 5000 })
      await section.locator('[name=website]').fill('bot')
    }
    await button.click()
    await section.getByRole('status').waitFor()
    assert.equal((await goals(page, 'visit_submit')).length, 0)
    assert.equal(io.requests.length, start + 2)
  }
}

try {
  for (const size of sizes) {
    const f = await fixture(size)
    for (const pathname of routes) await checkLayout(f, pathname, size[0])
    assert.deepEqual(f.io.errors, [])
    await f.page.close()
    console.log(size.join('×') + ': both visit sections, navigation and order steps passed')
  }
  const f = await fixture(sizes[3], 'no-preference')
  await go(f.page, '/syktyvkar/')
  await openFrom(f.page, cardButton(f.page, 'video'), 'video', 'video', true, true)
  for (const pathname of routes) for (const id of Object.keys(labels)) await checkPost(f, pathname, id)
  await checkErrors(f)
  assert.deepEqual(f.io.errors, [])
  await f.page.close()
  console.log('Six visit submissions, pending duplicate, failure/retry, consent and anti-spam passed.')
} finally {
  await browser.close()
  await server.close()
}
