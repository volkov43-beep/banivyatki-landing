/**
 * Единственная точка отправки заявок: POST с JSON на PHP-обработчик
 * /api/lead.php (public/api/lead.php → на сервере public_html/api/lead.php),
 * который создаёт в Битрикс24 контакт и сделку. Адрес — только здесь.
 *
 * Возвращает { ok: true } или { ok: false, error }. Обработчик отвечает
 * коротким JSON ({"ok":true} / {"ok":false,"error":"<код>"}); при
 * недоступном Битриксе он сам кладёт заявку в очередь и отвечает успехом.
 * Ошибка сети, таймаут 15 с или не-JSON — { ok: false }: форма показывает
 * «Не удалось отправить заявку…» с телефоном, введённое остаётся.
 *
 * К payload здесь добавляется referrer (откуда перешли на сайт). Цели
 * Метрики формы шлют только при { ok: true }. В режиме разработки
 * (npm run dev) PHP нет: заявка дополнительно пишется в консоль, а запрос
 * получает 404 — это ожидаемо.
 */
export const LEAD_ENDPOINT = `${import.meta.env.BASE_URL}api/lead.php`
const TIMEOUT_MS = 15000

export async function submitLead(payload) {
  const body = {
    ...payload,
    referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
  }
  if (import.meta.env.DEV) console.log('[lead]', body)

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null
  try {
    const res = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      signal: controller?.signal,
    })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.ok === true) return { ok: true }
    return { ok: false, error: data?.error || `http_${res.status}` }
  } catch (err) {
    return { ok: false, error: err?.name === 'AbortError' ? 'timeout' : 'network' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
