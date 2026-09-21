/**
 * Обёртка над целями Яндекс.Метрики.
 * Номер счётчика подставим позже. Пока счётчика нет — функция молча
 * ничего не делает и не бросает ошибок.
 */
export const YM_COUNTER_ID = null

export function track(goal, params) {
  if (!YM_COUNTER_ID || typeof window === 'undefined' || typeof window.ym !== 'function') return
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
