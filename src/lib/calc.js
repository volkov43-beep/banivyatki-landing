/**
 * Запрос «рассчитать такую» из любого места страницы (карточки блока
 * «Наши работы»): калькулятор слушает событие, переключается на вкладку
 * «Себе», ставит сезон и выбирает карточку размера — теми же обработчиками
 * и целями, что и при ручном выборе, — и прокручивает к сетке карточек
 * (не к форме: человек должен увидеть цену и соседние варианты).
 *
 * season — `warm` / `year`, cardId — id карточки из data/calculator.js.
 * Без аргументов (requestCalcOpen) — только вкладка «Себе» и прокрутка
 * к началу калькулятора: сезон и размер человек выбирает сам.
 */
const EVENT = 'bv:calc'

export function requestCalc(season, cardId) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { season, cardId } }))
}

/** Открыть калькулятор без выбора: вкладка «Себе», прокрутка к заголовку. */
export function requestCalcOpen() {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: {} }))
}

/** Подписка на запросы; возвращает функцию отписки. */
export function onCalcRequest(handler) {
  const listener = (e) => handler(e.detail.season, e.detail.cardId)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
