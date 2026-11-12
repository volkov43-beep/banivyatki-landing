// npm run build, then php server/tests/handler.test.php --browser (local PHP and Bitrix stub).
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'

const { chromium } = await import(process.env.BV_PLAYWRIGHT_PATH || 'playwright-core')
assert.ok(process.env.BV_STUB_CALLS, 'Start with handler.test.php --browser')
const origin = 'https://banivyatki.ru'
const dist = path.resolve('dist')
const header = 'Лендинг: Сыктывкар / Республика Коми\nУсловия: региональная стоимость\nУточнить населённый пункт, адрес доставки и условия установки.\n'
const goals = { catalog: 'catalog_submit', calculator: 'calc_submit', quiz: 'quiz_submit', visit: 'visit_submit',
  final: 'final_submit', faq_question: 'faq_question_submit', business: 'business_submit' }

// The current cards open the quiz. Exercise the supported model-specific CatalogForm separately.
const modelFixture = await build({
  stdin: { contents: [
    "import { createElement } from 'react'",
    "import { createRoot } from 'react-dom/client'",
    "import CatalogForm from './src/components/catalog/CatalogForm.jsx'",
    "import { CATALOG_MODELS } from './src/data/catalog.js'",
    "import { captureUtm } from './src/lib/utm.js'",
    "captureUtm()",
    "createRoot(document.getElementById('fixture')).render(createElement(CatalogForm, {model: CATALOG_MODELS.find(m => m.crmCode === 'podkova-45')}))",
  ].join('\n'), resolveDir: process.cwd() },
  bundle: true, write: false, jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' },
})
const browser = await chromium.launch({ executablePath: process.env.BV_CHROMIUM_PATH, args: ['--no-sandbox','--disable-dev-shm-usage'] })
const calls = async () => (await readFile(process.env.BV_STUB_CALLS, 'utf8').catch(err => {
  if (err.code === 'ENOENT') return ''
  throw err
})).split('\n').filter(Boolean)

async function openForm(page, scenario, regional) {
  const dialog = page.locator('dialog[open]')
  const calc = page.locator('#calculator')
  switch (scenario) {
    case 'all':
      await page.locator('#top').getByRole('button', { name: 'Получить каталог' }).click()
      return dialog
    case 'model': return page.locator('#fixture')
    case 'calculator':
      await calc.getByRole('radio', { name: 'Круглый год, включая морозы' }).click()
      await calc.getByRole('radiogroup', { name: 'Вариант бани' }).getByRole('radio').last().click()
      return calc
    case 'business':
      await calc.getByRole('radio', { name: 'Для бизнеса' }).click()
      await calc.locator('[autocomplete=organization]').fill('Тестовая база')
      await calc.locator('textarea').fill('Две бани')
      return calc
    case 'visit':
      await page.locator('#showroom [aria-labelledby=visit-video-title] button').click()
      return page.locator('#visit-form')
    case 'final': return page.locator('#final')
    case 'faq_question':
      await page.locator('#faq textarea').fill('Как согласовать основание?')
      return page.locator('#faq')
    case 'quiz':
      await page.locator('#quiz').getByRole('button', { name: 'Начать подбор' }).click()
      await dialog.locator('input[value=ready]').check()
      await dialog.getByText('Шаг 2 из 5').waitFor()
      for (let i = 2; i <= 4; i++) await dialog.getByRole('button', { name: 'Далее' }).click()
      await dialog.locator(regional ? 'input[value="570_770"]' : 'input[value="500_700"]').check()
      await dialog.locator('input[value=call]').check()
      return dialog
  }
}

async function checkSubmission(scenario, regional, seq) {
  const page = await browser.newPage({ reducedMotion: 'reduce', serviceWorkers: 'block' })
  const errors = []
  page.on('pageerror', err => errors.push(err.message))
  const payloads = []
  const form = ['all','model'].includes(scenario) ? 'catalog' : scenario
  const goal = goals[form]
  const direct = seq % 3 !== 0
  const utm = { utm_source: direct ? 'yandex' : 'organic', utm_medium: direct ? 'cpc' : 'site',
    utm_campaign: 'region-test', utm_content: scenario, utm_term: 'баня' }
  const pathname = regional ? '/syktyvkar/' : '/'
  const url = origin + pathname + '?' + new URLSearchParams(utm) + '#top'
  try {
    await page.addInitScript(() => {
      window.goals = []
      window.ym = (id, method, name) => { if (method === 'reachGoal') window.goals.push({ id, name }) }
      const now = Date.now.bind(Date)
      window.extraTime = 0
      Date.now = () => now() + window.extraTime
    })
    // No request is continued to the public host. Pages/assets come from dist; PHP runs on loopback.
    await page.route('**/*', async route => {
      const u = new URL(route.request().url())
      if (u.origin !== origin) return route.abort()
      if (u.pathname === '/api/lead.php') {
        assert.equal(route.request().method(), 'POST')
        payloads.push(route.request().postDataJSON())
        if (payloads.length === 1) return route.fulfill({ status: 503, json: { ok: false } })
        const response = await page.request.post('http://127.0.0.1:8090/api/lead.php', {
          data: route.request().postDataBuffer(),
          headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Test-IP': '10.1.0.' + seq },
        })
        return route.fulfill({ response })
      }
      if (scenario === 'model' && u.pathname === pathname) return route.fulfill({ contentType: 'text/html',
        body: '<!doctype html><meta charset="utf-8"><div id="fixture"></div><script src="/test-model.js"></script>' })
      if (scenario === 'model' && u.pathname === '/test-model.js') return route.fulfill({
        contentType: 'text/javascript', body: modelFixture.outputFiles[0].text })
      if (u.pathname === pathname) return route.fulfill({ path: path.join(dist, pathname, 'index.html') })
      if (/^\/(assets|photos)\/[^/]+$/.test(u.pathname)) return route.fulfill({ path: path.join(dist, u.pathname) })
      return route.abort()
    })
    await page.goto(url)
    const section = await openForm(page, scenario, regional)
    const fields = section.locator('form')
    await fields.locator('[type=tel]').fill('+79991234567')
    await fields.locator('[type=checkbox]').check()
    await page.evaluate(() => { window.extraTime = 4000 })
    const submit = fields.locator('[type=submit]')
    const successes = () => page.evaluate(name => window.goals.filter(g => g.name === name), goal)
    const before = (await calls()).length
    await submit.click()
    await section.getByRole('alert').waitFor()
    assert.equal(payloads.length, 1)
    assert.deepEqual(await successes(), [])
    assert.equal((await calls()).length, before)
    await submit.click()
    await section.getByRole('status').waitFor()
    assert.equal(payloads.length, 2, 'one POST per deliberate attempt')
    assert.deepEqual(await successes(), [{ id: 113423850, name: goal }])
    const payload = payloads[1]
    assert.equal(payload.form, form)
    assert.equal(payload.page_url, page.url())
    assert.equal(new URL(payload.page_url).pathname, pathname)
    assert.equal(Object.hasOwn(payload, 'region'), false)
    const newCalls = (await calls()).slice(before)
    assert.deepEqual(newCalls.map(c => c.split(' ', 1)[0]), ['crm.duplicate.findbycomm','crm.contact.add','crm.deal.add'])
    const deal = JSON.parse(newCalls[2].slice('crm.deal.add '.length)).fields
    const titles = { all: 'Каталог · Все модели', model: 'Каталог', visit: 'Запись: видеозвонок',
      faq_question: 'Вопрос', business: 'Для бизнеса', final: 'Расчёт', quiz: 'Квиз',
      calculator: 'Расчёт · 6 м, круглый год · от ' + (regional ? '585 000' : '515 000') + ' ₽' }
    assert.equal(deal.TITLE, (regional ? 'Сыктывкар · ' : '') + 'Сайт · ' + titles[scenario])
    assert.ok(deal.COMMENTS.startsWith((regional ? header : '') + 'Форма: '))
    assert.ok(deal.COMMENTS.includes('Страница: ' + payload.page_url + '\n'))
    assert.equal(deal.SOURCE_ID, direct ? 'DIRECT' : 'WEB')
    for (const [key, value] of Object.entries(utm)) {
      assert.equal(payload[key], value)
      assert.equal(deal[key.toUpperCase()], value)
    }
    if (form === 'catalog') assert.equal(payload.catalog_model, scenario === 'model' ? 'podkova-45' : 'all')
    if (scenario === 'model') assert.ok(deal.COMMENTS.includes('Интересующая модель: Подкова 4,5 м\n'))
    if (form === 'calculator') assert.equal(payload.price_shown, regional ? 585000 : 515000)
    if (form === 'quiz') assert.ok(deal.COMMENTS.includes('Бюджет: ' + (regional ? '570–770' : '500–700') + ' тыс. ₽'))
    if (form === 'visit') assert.equal(payload.visit_type, 'video')
    assert.deepEqual(errors, [])
    console.log(pathname + ' ' + scenario + ': failed attempt, accepted retry and one local CRM deal passed')
  } finally { await page.close() }
}
try {
  let seq = 0
  for (const regional of [false, true]) {
    for (const scenario of ['all','model','calculator','business','visit','faq_question','final','quiz']) {
      await checkSubmission(scenario, regional, ++seq)
    }
  }
} finally { await browser.close() }
