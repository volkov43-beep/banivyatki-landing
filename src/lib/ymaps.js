/**
 * Загрузка JavaScript API Яндекс Карт v3 по требованию.
 * Скрипт вставляется один раз и только когда его попросили (блок карты
 * подошёл к экрану). Ключ приходит из VITE_YMAPS_KEY на этапе сборки.
 *
 * Ошибка загрузки — Error с полем `code`:
 *   'script'  — тег <script> не загрузился (нет сети, блокировщик, 403 по Referer);
 *   'timeout' — скрипт не ответил за `timeout` мс;
 *   'api'     — скрипт загрузился, но API не поднялось (например, отклонён ключ),
 *               текст ошибки Яндекса в `message`.
 * Тариф бесплатный, лимит загрузок в сутки небольшой, поэтому повторных
 * попыток нет: одна загрузка за визит.
 */
let pending = null

function makeError(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

export function loadYmaps(key, { timeout = 15000 } = {}) {
  if (typeof window === 'undefined') return Promise.reject(makeError('api', 'no window'))
  if (window.ymaps3) return window.ymaps3.ready.then(() => window.ymaps3)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(key)}&lang=ru_RU`
    script.async = true
    const timer = setTimeout(() => fail(makeError('timeout', `скрипт не ответил за ${timeout / 1000} с`)), timeout)
    const fail = (err) => {
      clearTimeout(timer)
      pending = null
      script.remove()
      reject(err)
    }
    script.onerror = () => fail(makeError('script', 'тег <script> не загрузился'))
    script.onload = () => {
      clearTimeout(timer)
      if (!window.ymaps3) return fail(makeError('api', 'после загрузки скрипта нет window.ymaps3'))
      window.ymaps3.ready.then(
        () => resolve(window.ymaps3),
        (e) => fail(makeError('api', e?.message || String(e))),
      )
    }
    document.head.appendChild(script)
  })
  return pending
}
