/**
 * Загрузка JavaScript API Яндекс Карт v3 по требованию.
 * Скрипт вставляется один раз и только когда его попросили (блок карты
 * подошёл к экрану). Ключ приходит из VITE_YMAPS_KEY на этапе сборки.
 */
let pending = null

export function loadYmaps(key, { timeout = 15000 } = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.ymaps3) return window.ymaps3.ready.then(() => window.ymaps3)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(key)}&lang=ru_RU`
    script.async = true
    const timer = setTimeout(() => fail(new Error('ymaps timeout')), timeout)
    const fail = (err) => {
      clearTimeout(timer)
      pending = null
      script.remove()
      reject(err)
    }
    script.onerror = () => fail(new Error('ymaps script failed'))
    script.onload = () => {
      clearTimeout(timer)
      if (!window.ymaps3) return fail(new Error('ymaps3 missing'))
      window.ymaps3.ready.then(() => resolve(window.ymaps3), fail)
    }
    document.head.appendChild(script)
  })
  return pending
}
