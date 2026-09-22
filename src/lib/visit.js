/**
 * Запрос «записаться на показ» из любого места страницы (например, ссылка
 * в ответе FAQ): блок «Посмотрите баню до покупки» слушает событие,
 * выбирает способ в форме и прокручивает к ней.
 *
 * type — способ показа для формы (`showroom` / `production` / `video`),
 * goal — значение `type` в цели Метрики visit_button (по умолчанию = type;
 * для ссылки из FAQ — `faq`).
 */
const EVENT = 'bv:visit'

export function requestVisit(type, goal = type) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { type, goal } }))
}

/** Подписка на запросы; возвращает функцию отписки. */
export function onVisitRequest(handler) {
  const listener = (e) => handler(e.detail.type, e.detail.goal)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
