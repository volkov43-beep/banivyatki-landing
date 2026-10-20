// BV_JSDOM_PATH=/absolute/path/to/jsdom/lib/api.js node scripts/tests/cta.dom.mjs
// Mount the real App so these checks include cross-section wiring, under StrictMode.
import { build } from 'esbuild'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const { JSDOM } = await import(process.env.BV_JSDOM_PATH || 'jsdom')
const dom = new JSDOM('<div id="root"></div>', { url: 'https://banivyatki.ru/?utm_source=yandex&utm_medium=cpc', pretendToBeVisual: true })
for (const key of ['window', 'document', 'sessionStorage', 'HTMLElement', 'HTMLInputElement', 'HTMLDialogElement', 'Event', 'MouseEvent', 'CustomEvent']) globalThis[key] = dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.IntersectionObserver = class { observe() {} disconnect() {} unobserve() {} }
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
let scrolls = 0
window.scrollTo = () => { scrolls++ }
HTMLElement.prototype.scrollIntoView = () => { scrolls++ }
const folder = repo + 'node_modules/.cache/cta-dom'
await mkdir(folder, { recursive: true })
await build({ entryPoints: [repo + 'src/App.jsx'], outfile: folder + '/app.mjs', bundle: true, format: 'esm', platform: 'node', jsx: 'automatic', external: ['react', 'react-dom', 'react/jsx-runtime'], define: { 'import.meta.env.DEV': 'false', 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.VITE_YMAPS_KEY': '""' } })
const { default: React, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: App } = await import(pathToFileURL(folder + '/app.mjs'))
const { QUIZ_STORAGE_KEY } = await import('../../src/data/quiz.js')
const { captureUtm } = await import('../../src/lib/utm.js')
captureUtm()
let root, checks = 0, clock = 0
const now = Date.now
Date.now = () => now() + clock
const goals = [], requests = []
window.ym = (id, method, goal, params) => goals.push({ id, goal, params })
globalThis.fetch = (url, options) => new Promise(resolve => requests.push({ url, payload: JSON.parse(options.body), resolve }))
const check = (name, value) => { assert.ok(value, name); checks++ }
const goalCount = (name) => goals.filter(g => g.goal === name).length
const saved = () => JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY))
const dialog = () => document.querySelector('dialog[open]')
const button = (text, within = document) => [...within.querySelectorAll('button')].find(el => el.textContent === text)
const cards = () => [...document.querySelectorAll('#catalog button')].filter(el => el.textContent === 'Рассчитать стоимость')
const click = async (el, twice = false) => {
  assert.ok(el, 'click target exists')
  el.focus()
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    if (twice) el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}
const close = () => click(dialog().querySelector('[aria-label="Закрыть"]'))
const cancel = () => act(async () => dialog().dispatchEvent(new Event('cancel', { cancelable: true })))
const wait = (ms = 280) => act(async () => new Promise(resolve => setTimeout(resolve, ms)))
const input = (el, value) => act(async () => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
})
const submit = (twice = false) => act(async () => {
  const form = dialog().querySelector('form')
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  if (twice) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
})
const resolve = (request, ok) => act(async () => request.resolve({ ok, status: ok ? 200 : 500, json: async () => ({ ok }) }))
const mount = () => act(async () => { root = createRoot(document.getElementById('root')); root.render(React.createElement(React.StrictMode, null, React.createElement(App))) })
const toContacts = async () => {
  await click(dialog().querySelector('[value=ready]')); await wait()
  for (let i = 0; i < 4; i++) await click(button('Далее', dialog()))
  check('five questions lead to the existing final form', !!dialog().querySelector('form input[type=tel]') && dialog().textContent.includes('Контактные данные'))
}
const contactsEmpty = () => dialog().querySelector('[type=tel]').value === '' && dialog().querySelector('[autocomplete=name]').value === '' && !dialog().querySelector('input[type=radio]:checked') && !dialog().querySelector('input[type=checkbox]').checked
const fillQuiz = async () => {
  await input(dialog().querySelector('[type=tel]'), '+79991234567')
  await input(dialog().querySelector('[autocomplete=name]'), 'Тест контакта')
  await click(dialog().querySelector('[value=max]'))
  await click(dialog().querySelector('[type=checkbox]'))
  clock += 4000
}
try {
  sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify({ version: 'v1', step: 4, answers: { quiz_place: 'no_plot', quiz_area: 'spacious_60', quiz_features: 'shower', quiz_timing: 'later' }, widget: 'compact', started: true, completed: false }))
  await mount()
  const beforeHero = sessionStorage.getItem(QUIZ_STORAGE_KEY)
  const hero = button('Получить каталог', document.querySelector('#top'))
  check('Hero CTA is a native button, without anchor navigation', hero?.type === 'button' && !hero.hasAttribute('href'))
  await click(hero, true)
  check('Hero opens one existing catalog form without scrolling', document.querySelectorAll('dialog[open]').length === 1 && !!dialog().querySelector('form') && dialog().textContent.includes('Каталог всех моделей') && scrolls === 0)
  check('catalog_open all exactly once for double click', goalCount('catalog_open') === 1 && goals.find(g => g.goal === 'catalog_open').params.model === 'all' && goalCount('catalog_submit') === 0)
  check('body locked', document.body.style.overflow === 'hidden')
  await cancel()
  check('catalog Escape restores Hero focus and scroll', !dialog() && document.activeElement === hero && document.body.style.overflow === '')
  await click(hero)
  await input(dialog().querySelector('[type=tel]'), '+79991234567')
  await input(dialog().querySelector('[autocomplete=name]'), 'Тест контакта')
  await click(button('MAX', dialog()))
  await click(dialog().querySelector('[type=checkbox]'))
  clock += 4000
  await submit(true)
  check('catalog double submit sends one all payload', requests.length === 1 && requests[0].payload.form === 'catalog' && requests[0].payload.catalog_model === 'all' && requests[0].payload.contact_method === 'max' && requests[0].payload.utm_source === 'yandex')
  check('catalog_submit waits for confirmed success', goalCount('catalog_submit') === 0)
  await resolve(requests[0], false)
  check('catalog error preserves contacts and never sends success goal', !!dialog().querySelector('[role=alert]') && dialog().querySelector('[type=tel]').value.includes('999') && goalCount('catalog_submit') === 0)
  await submit(); await resolve(requests[1], true)
  check('catalog confirmed success tracks all once', !!dialog().querySelector('[role=status]') && goalCount('catalog_submit') === 1 && goals.find(g => g.goal === 'catalog_submit').params.model === 'all')
  await close()
  check('catalog close restores Hero focus and preserves old quiz', document.activeElement === hero && sessionStorage.getItem(QUIZ_STORAGE_KEY) === beforeHero && scrolls === 0)

  const plans = [...document.querySelectorAll('#catalog button')].filter(el => el.getAttribute('aria-label')?.startsWith('Планировка'))
  check('three cards have new calculation CTA and original plan preview', cards().length === 3 && plans.length === 3 && !button('Получить каталог', document.querySelector('#catalog')))
  const modelCodes = ['podkova-35', 'podkova-45', 'podkova-60']
  for (const [index, plan] of plans.entries()) {
    await click(plan)
    check(`plan ${index}: original image and no catalog CTA`, dialog().querySelector('img').getAttribute('src').includes(modelCodes[index] + '-plan-1280.webp') && !dialog().querySelector('form') && !button('Получить каталог', dialog()))
    await click(dialog().querySelector('img')); check('plan content does not close', !!dialog())
    await cancel(); check('plan returns focus', document.activeElement === plan)
  }
  check('plan events once per model', goalCount('catalog_plan_open') === 3)
  for (const [index, card] of cards().entries()) {
    const opens = goalCount('quiz_open'), steps = goalCount('quiz_step')
    await click(card, true)
    check(`card ${index}: new run at mandatory first question`, dialog().querySelector('h2').textContent === 'Есть ли уже место для установки бани?' && dialog().textContent.includes('Шаг 1 из 5') && !dialog().querySelector('input:checked') && !button('Далее', dialog()) && !button('Начать подбор', dialog()) && Object.keys(saved().answers).length === 0)
    const lastOpen = goals.filter(g => g.goal === 'quiz_open').at(-1)
    check(`card ${index}: one open, safe card context, no step/scroll`, goalCount('quiz_open') === opens + 1 && lastOpen.params.source === 'catalog_card' && lastOpen.params.model === modelCodes[index] && goalCount('quiz_step') === steps && scrolls === 0)
    await toContacts()
    check(`card ${index}: no size prefill and empty contacts`, saved().answers.quiz_area === 'skipped' && contactsEmpty())
    await fillQuiz()
    await close()
    check(`card ${index}: focus returns to card`, document.activeElement === card)
  }
  // Resume is intentionally distinct from the explicit new-run action on cards.
  const resumeSteps = goalCount('quiz_step')
  await click(button('Продолжить', document.querySelector('aside')))
  check('expanded reminder resumes contacts with draft and no new step', !!dialog().querySelector('form') && dialog().querySelector('[autocomplete=name]').value === 'Тест контакта' && goalCount('quiz_step') === resumeSteps)
  await close(); await click(document.querySelector('[aria-label="Свернуть напоминание"]')); await click(document.querySelector('aside > button'))
  check('compact reminder also resumes without resetting', !!dialog().querySelector('form') && dialog().querySelector('[value=max]').checked && dialog().querySelector('[type=checkbox]').checked)

  const pendingCount = requests.length
  await submit(true)
  check('quiz double submit sends only one request', requests.length === pendingCount + 1)
  const oldRequest = requests.at(-1), submitGoals = goalCount('quiz_submit')
  await close(); await click(cards()[0])
  check('new card starts step1 even with old HTTP pending', saved().step === 0 && Object.keys(saved().answers).length === 0 && !dialog().querySelector('input:checked'))
  await toContacts()
  check('new final form is empty and cannot send while old HTTP pending', contactsEmpty() && dialog().querySelector('[type=submit]').disabled)
  await submit(); check('no concurrent request across attempts', requests.length === pendingCount + 1)
  const currentAnswers = JSON.stringify(saved().answers)
  await resolve(oldRequest, true)
  check('late success tracked once without completing/resetting new attempt', goalCount('quiz_submit') === submitGoals + 1 && !saved().completed && JSON.stringify(saved().answers) === currentAnswers && !!dialog().querySelector('form') && !dialog().querySelector('[role=status]') && !dialog().querySelector('[type=submit]').disabled)
  await fillQuiz(); await submit(true)
  check('new attempt may send only after old request finishes', requests.length === pendingCount + 2)
  const failedRequest = requests.at(-1)
  await close(); await click(cards()[1])
  await resolve(failedRequest, false)
  check('late error does not damage new step1 or emit success', saved().step === 0 && !saved().completed && Object.keys(saved().answers).length === 0 && goalCount('quiz_submit') === submitGoals + 1 && !dialog().querySelector('[role=alert]'))
  await toContacts(); await fillQuiz(); await submit(); await resolve(requests.at(-1), true)
  check('new attempt succeeds independently after late error', saved().completed && !!dialog().querySelector('[role=status]') && goalCount('quiz_submit') === submitGoals + 2)
  check('quiz payload never includes click model or new fields', requests.filter(r => r.payload.form === 'quiz').every(r => !('catalog_model' in r.payload) && !('model' in r.payload) && r.payload.quiz_version === 'v1' && r.payload.quiz_area === 'skipped'))
  check('contacts never enter storage', !JSON.stringify([Object.entries(sessionStorage), Object.entries(window.localStorage)]).includes('999123') && !JSON.stringify([Object.entries(sessionStorage), Object.entries(window.localStorage)]).includes('Тест контакта'))
  check('no PII in analytics; existing counter and safe parameters', goals.every(g => g.id === 113423850 && Object.keys(g.params || {}).every(key => ['source', 'model', 'step', 'question'].includes(key))) && !JSON.stringify(goals).includes('999123') && !JSON.stringify(goals).includes('Тест контакта'))
  await close()
  const beforeWorks = goalCount('quiz_open'), beforeCatalog = goalCount('catalog_open')
  await click(button('Рассчитать такую')); await wait()
  check('Works still selects the existing calculator instead of opening a modal', !dialog() && scrolls > 0 && goalCount('calc_card_select') > 0 && goalCount('quiz_open') === beforeWorks && goalCount('catalog_open') === beforeCatalog)
  check('phone and calculator anchor still present', !!document.querySelector('header a[href="tel:+78332775770"]') && !!document.getElementById('calculator'))
  await act(async () => root.unmount())
  sessionStorage.clear(); await mount()
  await click(cards()[0]); await click(dialog().querySelector('[value=ready]')); await wait(); await close()
  await click(cards()[1]); await click(dialog().querySelector('[value=ready]')); await wait()
  check('quiz_start remains once per session across explicit new runs', goalCount('quiz_start') === 1)
  await act(async () => root.unmount())
  console.log(`CTA DOM: ${checks} checks passed. Full App / StrictMode / mocked HTTP / polyfilled dialog.`)
} finally {
  Date.now = now
  await rm(folder, { recursive: true, force: true })
  dom.window.close()
}
