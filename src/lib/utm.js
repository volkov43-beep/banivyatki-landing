/**
 * UTM-метки: сохраняем в sessionStorage при первом заходе, чтобы не потерять,
 * пока человек ходит по странице.
 */
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const STORAGE_KEY = 'bv_utm'

function fromUrl() {
  const params = new URLSearchParams(window.location.search)
  const utm = {}
  for (const key of KEYS) utm[key] = params.get(key) || ''
  return utm
}

/** Вызывается один раз при загрузке страницы. */
export function captureUtm() {
  if (typeof window === 'undefined') return
  try {
    const utm = fromUrl()
    const hasAny = KEYS.some((key) => utm[key])
    if (hasAny || !sessionStorage.getItem(STORAGE_KEY)) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm))
    }
  } catch {
    /* sessionStorage может быть недоступен — тогда возьмём метки из адреса */
  }
}

export function getUtm() {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    /* см. выше */
  }
  return fromUrl()
}
