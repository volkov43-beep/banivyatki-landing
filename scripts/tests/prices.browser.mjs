// Run npm run build first. Uses the same local Chromium and optional Onest cache as cta.browser.mjs.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { preview } from 'vite'
import { getRegionalPrices } from '../../src/data/pricing.js'
import { REGIONS } from '../../src/data/regions.js'

const viewports = [[320, 568], [360, 740], [375, 812], [390, 844], [768, 1024], [1024, 768], [1280, 720], [1440, 900]]
const options = [
  ['warm-3', '3 м'], ['warm-45', '4–4,5 м'], ['warm-6', '6 м'],
  ['year-3', '3 м'], ['year-45', '3,5–4,5 м'], ['year-6', '6 м'],
]
const regions = {
  kirov: { path: '/', cards: [293000,330000,374000,333000,363000,515000], works: [293000,435000,590000,650000,1200000] },
  syktyvkar: { path: '/syktyvkar/', cards: [363000,400000,444000,403000,433000,585000], works: [363000,505000,660000,720000,1270000] },
}
const workTargets = [0,4,4,5,5]
const rub = amount => amount.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽'
const normalize = value => value.replace(/\s+/g, ' ').trim()
const utm = { utm_source: 'yandex', utm_medium: 'cpc', utm_campaign: 'price-test', utm_content: 'calculator', utm_term: 'баня' }
const query = '?' + new URLSearchParams(utm)
const seasonName = i => i < 3 ? 'тёплый сезон' : 'круглый год'

for (const id of ['kirov','syktyvkar','syktyvkar','kirov']) {
  const prices = getRegionalPrices(REGIONS[id].priceAdjustment)
  assert.deepEqual(Object.values(prices.cards).flat().map(c => c.price), regions[id].cards)
  assert.deepEqual(prices.works.map(w => w.price), [...regions[id].works, undefined])
  assert.equal(prices.minimum, regions[id].cards[0])
}

const { chromium } = await import(process.env.BV_PLAYWRIGHT_PATH || 'playwright-core')
const server = await preview({ logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } })
const base = 'http://127.0.0.1:' + server.httpServer.address().port
const browser = await chromium.launch({ executablePath: process.env.BV_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
const fontCache = process.env.BV_FONT_CACHE
const fontUrls = fontCache ? (await readFile(path.join(fontCache, 'urls.txt'), 'utf8')).split('\n') : []

async function fixture([width, height]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 1024, reducedMotion: 'reduce' })
  page.setDefaultTimeout(7000)
  const errors = [], requests = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    window.goals = []
    window.ym = (_, method, goal, params) => { if (method === 'reachGoal') window.goals.push({ goal, params }) }
    const now = Date.now
    window.timeOffset = 0
    Date.now = () => now() + window.timeOffset
  })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === base) {
      if (url.pathname !== '/api/lead.php') return route.continue()
      assert.equal(route.request().method(), 'POST')
      assert.equal(await page.evaluate(() => window.goals.filter(e => ['calc_submit','quiz_submit'].includes(e.goal)).length), 0)
      requests.push(route.request().postDataJSON())
      return route.fulfill({ contentType: 'application/json', body: '{"ok":true}' })
    }
    if (fontCache && url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', path: path.join(fontCache, 'onest.css') })
    const i = fontUrls.indexOf(url.href)
    if (i >= 0) return route.fulfill({ contentType: 'font/ttf', path: path.join(fontCache, 'onest-' + i + '.font') })
    return route.abort()
  })
  return { page, errors, requests }
}

async function fits(price) {
  const geometry = await price.evaluate(el => {
    const range = document.createRange()
    range.selectNodeContents(el)
    const rect = range.getBoundingClientRect()
    const box = el.getBoundingClientRect()
    // A fallback font can draw Cyrillic text and ₽ in separate runs on the same line.
    const fragments = [...range.getClientRects()].filter(r => r.width > 0)
    const oneLine = fragments.length > 0 && Math.max(...fragments.map(r => r.top)) < Math.min(...fragments.map(r => r.bottom))
    return { value: el.textContent, oneLine, width: innerWidth, left: rect.left, right: rect.right,
      boxLeft: box.left, boxRight: box.right, clipped: el.scrollWidth > el.clientWidth + 1 }
  })
  assert.ok(geometry.oneLine && !geometry.clipped && geometry.left >= geometry.boxLeft - 1 &&
    geometry.right <= geometry.boxRight + 1 && geometry.left >= 0 && geometry.right <= geometry.width,
    'Price must fit on one line: ' + JSON.stringify(geometry))
}

async function verifyLayout(page, region, width) {
  const komi = region === regions.syktyvkar
  await page.goto(base + region.path)
  await page.locator('#top h1').waitFor()
  await page.evaluate(() => document.fonts.ready)
  const calc = page.locator('#calculator'), works = page.locator('#works')
  const cards = calc.getByRole('radiogroup', { name: 'Вариант бани' }).getByRole('radio')
  const minimum = 'от ' + rub(region.cards[0])
  assert.ok(await page.locator('#top').getByText(minimum, { exact: true }).isVisible())
  assert.ok(await works.getByText(minimum, { exact: true }).isVisible())
  assert.equal(await works.getByText('Аналогичная комплектация для Коми', { exact: true }).count(), komi ? 5 : 0)
  const faq = page.locator('#faq details').first()
  await faq.locator('summary').click()
  const answer = normalize(await faq.locator('p').first().innerText())
  const schema = JSON.parse(await page.locator('#faq script').textContent())
  assert.equal(normalize(schema.mainEntity[0].acceptedAnswer.text), answer)
  assert.ok(answer.includes(minimum))
  if (komi) assert.equal(answer, 'Баня-Подкова для Сыктывкара и Республики Коми стоит от 363 000 ₽. Цена зависит от размера и комплектации. Примерную стоимость можно посмотреть в калькуляторе. Условия доставки и установки уточним по адресу вашего участка.')
  assert.equal(await faq.locator('a').getAttribute('href'), '#calculator')
  assert.doesNotMatch(await page.locator('#catalog').innerText(), /₽/)
  const calcLabel = komi ? 'Рассчитать базовую комплектацию' : 'Рассчитать такую'
  const explanation = 'Калькулятор покажет базовую стоимость бани выбранного размера. Комплектацию как на фото рассчитает менеджер.'
  assert.equal(await works.getByText(explanation, { exact: true }).count(), komi ? 1 : 0)
  assert.equal(await works.getByRole('button', { name: calcLabel, exact: true }).count(), 5)
  const projects = works.locator('li')
  assert.equal(await projects.count(), 6)
  assert.doesNotMatch(await projects.last().innerText(), /₽|Аналогичная комплектация/)
  const summary = calc.locator('p').filter({ hasText: 'Вы выбрали:' }).locator('b')
  for (const [i, amount] of region.works.entries()) {
    const project = projects.nth(i)
    await fits(project.getByText(rub(amount), { exact: true }))
    await project.getByRole('button', { name: calcLabel, exact: true }).click()
    const index = workTargets[i]
    assert.equal(await cards.nth(index % 3).getAttribute('aria-checked'), 'true')
    assert.ok(normalize(await summary.innerText()).endsWith('от ' + rub(region.cards[index])))
    assert.equal(await page.evaluate(() => window.goals.filter(g => g.goal === 'works_calc_click').length), i + 1)
  }
  for (const [i, amount] of region.cards.entries()) {
    if (i % 3 === 0) {
      await calc.getByRole('radio', { name: i === 0 ? 'В тёплый сезон' : 'Круглый год, включая морозы' }).click()
      if (komi) {
        const copy = normalize(await page.locator('main').textContent())
        for (const forbidden of [293000,330000,374000,333000,515000,435000,590000,650000,1200000]) assert.ok(!copy.includes(rub(forbidden)))
        assert.doesNotMatch(copy, /20 км|В калькуляторе указаны цены Кирова/)
      }
    }
    const card = cards.nth(i % 3)
    const price = card.getByText('от ' + rub(amount), { exact: true })
    await fits(price)
    await price.click()
    assert.equal(normalize(await summary.innerText()), seasonName(i) + ', ' + options[i][1] + ', от ' + rub(amount))
    if (width < 1024) {
      // Allow the scheduled scroll to the form, then scroll back to the selected price.
      await page.waitForTimeout(300)
      await price.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
      assert.ok(await price.evaluate(el => {
        const box = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))
      }), 'mobile panel must leave the selected price readable')
      // A tall viewport can show the last price and the form together. The panel
      // appears when the form leaves the viewport, even for that configuration.
      await calc.locator('h2').evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
      const bar = calc.locator('.fixed').filter({ hasText: 'Получить расчёт' })
      await bar.waitFor()
      const stickyPrice = bar.getByText('от ' + rub(amount), { exact: true })
      await fits(stickyPrice)
    }
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
}

async function checkCalculatorPost({ page, requests }, region, i) {
  await page.goto(base + region.path + query)
  const calc = page.locator('#calculator')
  if (i >= 3) await calc.getByRole('radio', { name: 'Круглый год, включая морозы' }).click()
  const cards = calc.getByRole('radiogroup', { name: 'Вариант бани' }).getByRole('radio')
  await cards.nth(i % 3).click()
  const form = calc.locator('form')
  await form.locator('[type=tel]').fill('+79991234567')
  await form.locator('[type=checkbox]').check()
  await page.evaluate(() => { window.timeOffset += 4000 })
  const before = requests.length
  await form.getByRole('button', { name: 'Получить расчёт' }).click()
  await calc.getByRole('status').waitFor()
  assert.equal(requests.length, before + 1)
  const payload = requests.at(-1)
  assert.equal(payload.form, 'calculator')
  assert.equal(payload.card_id, options[i][0])
  assert.equal(payload.option_shown, options[i][1] + ', ' + seasonName(i))
  assert.equal(payload.price_shown, region.cards[i])
  assert.equal(payload.page_url, page.url())
  assert.equal(new URL(payload.page_url).pathname, region.path)
  for (const [key, value] of Object.entries(utm)) assert.equal(payload[key], value)
  assert.equal(await page.evaluate(() => window.goals.filter(g => g.goal === 'calc_submit').length), 1)
}

async function checkQuiz({ page, requests }) {
  const codes = ['under_420', '420_570', '570_770', 'over_770', 'unsure']
  const labels = ['До 420 тыс. ₽', '420–570 тыс. ₽', '570–770 тыс. ₽', 'Более 770 тыс. ₽', 'Пока не определился']
  const launch = page.locator('#quiz').getByRole('button', { name: 'Начать подбор' })
  const dialog = page.locator('dialog[open]')
  const choose = code => dialog.locator('input[value="' + code + '"]').check()
  await page.goto(base + '/')
  // A Kirov buyer returning with a pre-existing v1 answer.
  await page.evaluate(() => sessionStorage.setItem('bv_quiz_v1', JSON.stringify({
    version: 'v1', step: 4, started: true, answers: {
      quiz_place: 'ready', quiz_area: 'skipped', quiz_features: 'skipped', quiz_timing: 'skipped', quiz_budget: '350_500',
    },
  })))
  await page.reload()
  await launch.click()
  assert.ok(await dialog.locator('input[value="350_500"]').isChecked())
  const oldLabels = await dialog.locator('label span').allTextContents()
  assert.deepEqual(oldLabels, ['До 350 тыс. ₽', '350–500 тыс. ₽', '500–700 тыс. ₽', 'Более 700 тыс. ₽', 'Пока не определился'])
  await page.goto(base + '/syktyvkar/' + query)
  await launch.click()
  await choose('ready')
  await dialog.getByText('Шаг 2 из 5').waitFor()
  for (let step = 2; step <= 4; step++) await dialog.getByRole('button', { name: 'Далее' }).click()
  assert.deepEqual(await dialog.locator('label span').allTextContents(), labels)
  assert.deepEqual(await dialog.locator('input[type=radio]').evaluateAll(els => els.map(el => el.value)), codes)
  await choose('570_770')
  await dialog.getByRole('button', { name: 'Получить подборку' }).waitFor()
  await page.goto(base + '/')
  await launch.click()
  assert.ok(await dialog.locator('input[value="350_500"]').isChecked())
  await page.goto(base + '/syktyvkar/' + query)
  await launch.click()
  await dialog.locator('[type=tel]').fill('+79991234567')
  await choose('call')
  await dialog.locator('[type=checkbox]').check()
  await page.evaluate(() => { window.timeOffset += 4000 })
  const before = requests.length
  await dialog.getByRole('button', { name: 'Получить подборку' }).click()
  await dialog.getByRole('status').waitFor()
  assert.equal(requests.length, before + 1)
  assert.equal(requests.at(-1).quiz_budget, '570_770')
  assert.equal(await page.evaluate(() => window.goals.filter(g => g.goal === 'quiz_submit').length), 1)
  await page.goto(base + '/')
  await launch.click()
  assert.ok(await dialog.locator('input[value="350_500"]').isChecked())
}

try {
  for (const size of viewports) {
    const f = await fixture(size)
    for (const region of Object.values(regions)) await verifyLayout(f.page, region, size[0])
    assert.deepEqual(f.errors, [])
    await f.page.close()
    console.log(size.join('×') + ': both price lists, works links, FAQ and calculator totals passed')
  }
  const f = await fixture(viewports[3])
  for (const region of Object.values(regions)) {
    for (const i of options.keys()) await checkCalculatorPost(f, region, i)
  }
  await checkQuiz(f)
  assert.deepEqual(f.errors, [])
  await f.page.close()
  console.log('12 calculator POSTs, regional quiz contract and session isolation passed.')
} finally {
  await browser.close()
  await server.close()
}
