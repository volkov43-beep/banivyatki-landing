/**
 * Обёртка над целями Яндекс.Метрики. Счётчик 113423850 подключён в
 * index.html (код Яндекса в начале <head>), здесь только цели:
 * ym(YM_COUNTER_ID, 'reachGoal', goal, params).
 *
 * Если счётчик не загрузился (блокировщик, нет сети) — window.ym нет,
 * вызов молча пропускается: кнопки и формы работать не перестают.
 * В режиме разработки (import.meta.env.DEV — `npm run dev`) события в
 * Метрику не уходят, только в консоль.
 */
export const YM_COUNTER_ID = 113423850

export function track(goal, params) {
  if (typeof window === 'undefined') return
  if (import.meta.env.DEV) {
    console.log('[metrika]', goal, params ?? '')
    return
  }
  if (typeof window.ym !== 'function') return
  try {
    window.ym(YM_COUNTER_ID, 'reachGoal', goal, params)
  } catch {
    /* счётчик не должен ломать страницу */
  }
}

/** Цель phone_click: клик по любой ссылке tel: на странице. */
export function trackPhoneClicks() {
  if (typeof document === 'undefined') return
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="tel:"]')
    if (link) track('phone_click')
  })
}
