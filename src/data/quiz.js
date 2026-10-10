export const QUIZ_VERSION = 'v1'
export const QUIZ_STORAGE_KEY = 'bv_quiz_v1'
export const QUIZ_TITLE = 'Подберём баню под ваш участок и задачи'
export const QUIZ_SUBTITLE = 'Ответьте на 5 вопросов — определим подходящий размер, планировку и комплектацию под ваш бюджет'
export const QUIZ_SUCCESS_TITLE = 'Готово — скоро свяжемся с вами'
export const QUIZ_SUCCESS = 'Спасибо! Мы получили ваши ответы и подберём подходящие варианты бани. Менеджер свяжется с вами и отправит подборку удобным для вас способом.'
const options = (pairs) => pairs.map(([code, label]) => ({ code, label }))
export const QUIZ_QUESTIONS = [
  { id: 'place', field: 'quiz_place', type: 'single', required: true, title: 'Есть ли уже место для установки бани?', options: options([
    ['ready', 'Участок и место определены'], ['have_plot_choose_place', 'Участок есть, место ещё выбираю'],
    ['preparing_plot', 'Участок покупаю или готовлю'], ['no_plot', 'Пока участка нет'],
  ]) },
  { id: 'area', field: 'quiz_area', type: 'single', required: false, title: 'Какую площадь бани рассматриваете?', options: options([
    ['compact_35', 'Компактная — до 9 м² / 3,5 м'], ['medium_45', 'Средняя — около 11 м² / 4,5 м'],
    ['spacious_60', 'Просторная — около 14–15 м² / 6 м'], ['unsure', 'Пока не определился'],
  ]) },
  { id: 'features', field: 'quiz_features', type: 'multi', required: false, title: 'Что важно предусмотреть в бане?', options: options([
    ['year_round', 'Утепление для круглого года'], ['side_entry', 'Вход сбоку'], ['outside_firebox', 'Топка с улицы'],
    ['canopy', 'Козырёк'], ['terrace', 'Терраса / крыльцо'], ['shower', 'Душ / моечная'], ['unsure', 'Пока не знаю'],
  ]) },
  { id: 'timing', field: 'quiz_timing', type: 'single', required: false, title: 'Когда планируете установить баню?', options: options([
    ['asap', 'Как можно скорее'], ['month', 'В течение месяца'], ['one_three_months', '1–3 месяца'],
    ['three_six_months', '3–6 месяцев'], ['later', 'Позже / пока изучаю'],
  ]) },
  { id: 'budget', field: 'quiz_budget', type: 'single', required: false, title: 'На какой бюджет ориентируетесь?', options: options([
    ['under_350', 'До 350 тыс. ₽'], ['350_500', '350–500 тыс. ₽'], ['500_700', '500–700 тыс. ₽'],
    ['over_700', 'Более 700 тыс. ₽'], ['unsure', 'Пока не определился'],
  ]) },
]
export const QUIZ_CONTACT_METHODS = options([['max', 'MAX'], ['telegram', 'Telegram'], ['whatsapp', 'WhatsApp'], ['call', 'Позвонить']])

export function validQuizAnswer(question, value) {
  if (typeof value !== 'string' || !value) return false
  if (value === 'skipped') return !question.required
  const codes = value.split(',')
  if (question.type === 'single') return codes.length === 1 && question.options.some((o) => o.code === value)
  return codes.every((c) => question.options.some((o) => o.code === c)) && (!codes.includes('unsure') || codes.length === 1)
}
export function toggleQuizFeature(value, code) {
  const selected = new Set((value || '').split(',').filter((c) => c !== 'skipped'))
  if (code === 'unsure') return selected.has('unsure') ? '' : 'unsure'
  selected.delete('unsure')
  if (selected.has(code)) selected.delete(code)
  else selected.add(code)
  return QUIZ_QUESTIONS[2].options.filter((o) => selected.has(o.code)).map((o) => o.code).join(',')
}
export function emptyQuizState(started = false) {
  return { version: QUIZ_VERSION, step: 0, answers: {}, widget: 'hidden', completed: false, started }
}
export function readQuizState() {
  const initial = emptyQuizState()
  try {
    const saved = JSON.parse(sessionStorage.getItem(QUIZ_STORAGE_KEY))
    if (!saved || saved.version !== QUIZ_VERSION) return initial
    if (saved.completed === true) return { ...initial, completed: true, started: saved.started === true }
    const answers = {}
    for (const q of QUIZ_QUESTIONS) if (validQuizAnswer(q, saved.answers?.[q.field])) answers[q.field] = saved.answers[q.field]
    const firstMissing = QUIZ_QUESTIONS.findIndex((q) => !answers[q.field])
    const limit = firstMissing < 0 ? 5 : firstMissing
    const step = Number.isInteger(saved.step) ? Math.max(0, Math.min(saved.step, limit)) : 0
    return { ...initial, step, answers, started: saved.started === true, widget: ['expanded', 'compact'].includes(saved.widget) ? saved.widget : 'hidden' }
  } catch { return initial }
}
export function saveQuizState(state) {
  try { sessionStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(state)) } catch { /* Memory-only fallback. */ }
}
