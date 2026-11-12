// Run npm run build first; Vite preview is served on loopback for this test only.
// BV_PLAYWRIGHT_PATH=/path/to/playwright-core/index.mjs BV_CHROMIUM_PATH=/path/to/chromium node scripts/tests/cta.browser.mjs
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { preview } from 'vite'
const { chromium } = await import(process.env.BV_PLAYWRIGHT_PATH || 'playwright-core')
const server = await preview({ logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } })
const base = `http://127.0.0.1:${server.httpServer.address().port}`
const output = process.env.BV_QA_OUTPUT || 'node_modules/.cache/cta-browser'
await mkdir(output, { recursive: true })
const fontCache = process.env.BV_FONT_CACHE
const fontUrls = fontCache ? (await readFile(path.join(fontCache, 'urls.txt'), 'utf8')).split('\n') : []
const browser = await chromium.launch({ executablePath: process.env.BV_CHROMIUM_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
let checks = 0
const check = (name, value) => { assert.ok(value, name); checks++ }
const viewports = [[320, 568], [360, 740], [375, 812], [390, 844], [768, 1024], [1024, 768], [1280, 720], [1440, 900]]

async function checkHero(page, width, regional) {
  const hero = page.locator('#top')
  const cta = hero.getByRole('button', { name: 'Получить каталог', exact: true })
  const expectedPrice = regional ? 'от 363 000 ₽' : 'от 293 000 ₽'
  const subtitle = regional
    ? 'Производим в Кирове. Доставляем готовой и устанавливаем на вашем участке в Республике Коми.'
    : 'Привозим готовой и устанавливаем за 1 день.'
  const label = `${width}px ${regional ? 'Сыктывкар' : 'Киров'}`
  for (const text of [expectedPrice, subtitle, '5,0', 'Авито', '41 отзыв']) {
    check(`${label}: ${text}`, await hero.getByText(text, { exact: true }).isVisible())
  }
  const geography = hero.getByText('Сыктывкар и Республика Коми', { exact: true })
  const note = hero.getByText('Стоимость доставки и установки уточним по адресу вашего участка.', { exact: true })
  check(`${label}: geography`, await geography.count() === Number(regional))
  check(`${label}: delivery note`, await note.count() === Number(regional))
  check(`${label}: Hero photo decoded`, await hero.locator('picture img').evaluate(img => img.complete && img.naturalWidth > 0))
  check(`${label}: no horizontal overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  check(`${label}: price fits`, await hero.getByText(expectedPrice, { exact: true }).evaluate(el => {
    const rect = el.getBoundingClientRect()
    return rect.left >= 0 && rect.right <= innerWidth
  }))

  const facts = hero.getByRole('list')
  const badge = hero.getByRole('group', { name: 'Рейтинг Авито' })
  const mobileRegional = regional && width < 1024
  const offer = [
    ...(regional ? [geography] : []),
    hero.getByRole('heading', { level: 1 }),
    hero.getByText(subtitle, { exact: true }),
    hero.getByText(expectedPrice, { exact: true }),
    ...(regional ? [note] : []),
  ]
  const sequence = [...offer, ...(mobileRegional ? [cta, facts, badge] : [facts, badge, cta])]
  const boxes = await Promise.all(sequence.map(element => element.boundingBox()))
  check(`${label}: offer, CTA, facts and Avito badge follow the required visual order without overlaps`,
    boxes.every((box, i) => box && box.width > 0 && box.height > 0 && (i === 0 || box.y >= boxes[i - 1].y + boxes[i - 1].height - 1)))
  check(`${label}: one native Hero button, including hidden elements`, await hero.locator('button').count() === 1 && await cta.count() === 1)
  check(`${label}: both facts in order`, (await facts.getByRole('listitem').allTextContents()).join(' / ') === '1000+ бань с 2012 года / Гарантия 5 лет')
  if (mobileRegional) {
    const noteBox = await note.boundingBox(), buttonBox = await cta.boundingBox()
    const gap = buttonBox.y - (noteBox.y + noteBox.height)
    check(`${label}: comfortable gap directly below delivery note`, gap >= 16 && gap <= 32)
  }
}
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height } })
    const page = await context.newPage(), errors = [], payloads = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(() => {
      window.__qaGoals = []
      window.ym = (id, method, goal, params) => window.__qaGoals.push({ id, method, goal, params })
      const now = Date.now
      window.__qaClock = 0
      Date.now = () => now() + window.__qaClock
      // Playwright may scroll a target away from an overlapping fixed reminder.
      // Measure at the actual user click, before React opens the dialog.
      document.addEventListener('click', event => {
        if (event.target.closest('#top button, #catalog button')) window.__qaClickScroll = scrollY
      }, true)
    })
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin === new URL(base).origin) {
        if (url.pathname === '/api/lead.php') {
          payloads.push(route.request().postDataJSON())
          await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
        } else await route.continue()
      } else if (url.hostname === 'fonts.googleapis.com') {
        if (fontCache) await route.fulfill({ contentType: 'text/css', body: await readFile(path.join(fontCache, 'onest.css'), 'utf8') })
        else await route.continue()
      } else if (url.hostname === 'fonts.gstatic.com') {
        const index = fontUrls.indexOf(url.href)
        if (index >= 0) await route.fulfill({ contentType: 'font/ttf', body: await readFile(path.join(fontCache, `onest-${index}.font`)) })
        else await route.continue()
      } else await route.abort() // No production analytics, CRM, maps or embeds.
    })
    await page.goto(`${base}/syktyvkar/?utm_source=yandex&utm_medium=cpc`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await checkHero(page, width, true)
    await page.screenshot({ path: path.join(output, `regional-viewport-${width}.png`) })
    const regionalButton = page.locator('#top').getByRole('button', { name: 'Получить каталог', exact: true })
    await page.locator('header a[href^="tel:"]').focus()
    await page.keyboard.press('Tab')
    check(`${width}: Tab reaches the regional CTA after the header`, await regionalButton.evaluate(el => el === document.activeElement))
    await regionalButton.scrollIntoViewIfNeeded()
    check(`${width}: regional CTA unobstructed after scrolling`, await regionalButton.evaluate(el => {
      const r = el.getBoundingClientRect()
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight &&
        el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
    }))
    await page.keyboard.press('Enter')
    const regionalModal = page.locator('dialog[open]')
    await regionalModal.getByText('Каталог всех моделей', { exact: true }).waitFor()
    check(`${width}: regional CTA opens one catalog`, await regionalModal.count() === 1 && await page.evaluate(() => window.__qaGoals.filter(g => g.goal === 'catalog_open' && g.params.model === 'all').length === 1))
    if (width === 390) {
      await regionalModal.locator('input[type=tel]').fill('+79991234567')
      await regionalModal.locator('input[type=checkbox]').check()
      await page.evaluate(() => { window.__qaClock += 4000 })
      await regionalModal.getByRole('button', { name: 'Получить каталог', exact: true }).click()
      await regionalModal.getByRole('status').waitFor()
      check('regional catalog sends one request, URL, UTM and accepted goal', payloads.length === 1 &&
        payloads[0].form === 'catalog' && payloads[0].catalog_model === 'all' &&
        new URL(payloads[0].page_url).pathname === '/syktyvkar/' && payloads[0].utm_source === 'yandex' && payloads[0].utm_medium === 'cpc' &&
        await page.evaluate(() => window.__qaGoals.filter(g => g.goal === 'catalog_submit' && g.params.model === 'all').length === 1))
    }
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('dialog[open]'))
    check(`${width}: regional CTA focus restored`, await regionalButton.evaluate(el => el === document.activeElement))
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await checkHero(page, width, false)
    check(`${width}: Onest loaded`, await page.evaluate(() => [...document.fonts].some(f => f.family === 'Onest' && f.status === 'loaded')))
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    check(`${width}: no page horizontal overflow`, !await overflow())
    const hero = page.locator('#top').getByRole('button', { name: 'Получить каталог', exact: true })
    check(`${width}: native Hero button`, await hero.getAttribute('type') === 'button' && await hero.getAttribute('href') === null)
    await page.locator('#top').screenshot({ path: path.join(output, `hero-${width}.png`) })
    await hero.scrollIntoViewIfNeeded()
    await hero.click()
    const modal = page.locator('dialog[open]')
    await modal.getByText('Каталог всех моделей', { exact: true }).waitFor()
    check(`${width}: Hero opens one form without scrolling`, await modal.count() === 1 && await page.evaluate(() => Math.abs(scrollY - window.__qaClickScroll) <= 1))
    check(`${width}: native dialog and scroll lock`, await modal.evaluate(el => el.matches(':modal')) && await page.evaluate(() => document.body.style.overflow) === 'hidden')
    check(`${width}: form fits viewport`, await modal.evaluate(el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth + 1))
    // Native focus containment, not the DOM polyfill.
    await page.keyboard.press('Tab')
    check(`${width}: keyboard focus remains in form`, await modal.evaluate(el => el.contains(document.activeElement)))
    await modal.screenshot({ path: path.join(output, `catalog-form-${width}.png`) })
    if (width === 1440) {
      await modal.locator('input[type=tel]').fill('+79991234567')
      await modal.locator('input[autocomplete=name]').fill('Тест браузера')
      await modal.getByRole('radio', { name: 'MAX', exact: true }).click()
      await modal.locator('input[type=checkbox]').check()
      await page.evaluate(() => { window.__qaClock += 4000 })
      await modal.getByRole('button', { name: 'Получить каталог', exact: true }).click()
      await modal.getByRole('status').waitFor()
      check('browser catalog all payload and accepted goal', payloads.length === 1 && payloads[0].catalog_model === 'all' && payloads[0].form === 'catalog' && await page.evaluate(() => window.__qaGoals.filter(g => g.goal === 'catalog_submit' && g.params.model === 'all').length) === 1)
    }
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('dialog[open]'))
    check(`${width}: Escape returns Hero focus and unlocks scroll`, await hero.evaluate(el => el === document.activeElement) && await page.evaluate(() => document.body.style.overflow) === '')
    await page.locator('#catalog').screenshot({ path: path.join(output, `cards-${width}.png`) })
    const cardButtons = page.locator('#catalog').getByRole('button', { name: /^Рассчитать стоимость —/ })
    check(`${width}: three new CTAs fit their cards`, await cardButtons.count() === 3 && await cardButtons.evaluateAll(buttons => buttons.every(el => el.scrollWidth <= el.clientWidth + 1)))
    for (let i = 0; i < 3; i++) {
      const button = cardButtons.nth(i)
      await button.scrollIntoViewIfNeeded()
      await button.click()
      await modal.getByRole('heading', { name: 'Есть ли уже место для установки бани?' }).waitFor()
      check(`${width}/card${i}: starts clean at step1 without scroll`, await modal.locator('input:checked').count() === 0 && await page.evaluate(() => Math.abs(scrollY - window.__qaClickScroll) <= 1))
      check(`${width}/card${i}: quiz fits width`, await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1))
      if (i === 0) await modal.screenshot({ path: path.join(output, `quiz-${width}.png`) })
      await modal.locator('input[value=ready]').check()
      await modal.getByRole('heading', { name: 'Какую площадь бани рассматриваете?' }).waitFor()
      await modal.getByRole('button', { name: 'Закрыть', exact: true }).click()
      check(`${width}/card${i}: close returns card focus`, await button.evaluate(el => el === document.activeElement))
    }
    check(`${width}: quiz_open tracks all cards once`, await page.evaluate(() => window.__qaGoals.filter(g => g.goal === 'quiz_open' && g.params.source === 'catalog_card').map(g => g.params.model).join(',')) === 'podkova-35,podkova-45,podkova-60')
    const plan = page.locator('#catalog').getByRole('button', { name: 'Планировка — Подкова 4,5 м', exact: true })
    await plan.click()
    await modal.locator('img').waitFor()
    check(`${width}: plan image fits without new CTA`, await modal.locator('img').evaluate(el => el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth && getComputedStyle(el).objectFit === 'contain') && await modal.getByRole('button', { name: 'Получить каталог', exact: true }).count() === 0)
    await modal.locator('img').click()
    check(`${width}: clicking plan keeps dialog open`, await modal.count() === 1)
    await modal.screenshot({ path: path.join(output, `plan-${width}.png`) })
    await page.mouse.click(2, 2)
    await page.waitForFunction(() => !document.querySelector('dialog[open]'))
    check(`${width}: backdrop close returns plan focus`, await plan.evaluate(el => el === document.activeElement))
    check(`${width}: no overflow after modal interactions`, !await overflow())
    check(`${width}: no JavaScript errors`, errors.length === 0)
    await context.close()
    console.log(`Browser ${width}px: passed`)
  }
  console.log(`CTA browser: ${checks} checks passed in Chromium; local build, mocked HTTP/analytics.`)
} finally { await browser.close(); await new Promise(resolve => server.httpServer.close(resolve)) }
