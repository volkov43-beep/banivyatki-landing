import { useEffect, useRef, useState } from 'react'
import { OBJECTS, KIROV_LABEL } from '../data/objects.js'
import { loadYmaps } from '../lib/ymaps.js'
import { track } from '../lib/track.js'

/**
 * Экран «Где стоят наши бани». Светлый фон surface.
 *
 * Карта — Яндекс Карты, JavaScript API v3. Ключ из VITE_YMAPS_KEY (сборка);
 * без ключа, без сети или при ошибке API карты нет: остаются заголовок,
 * подзаголовок и текстовый список мест — без пустого прямоугольника.
 *
 * Скрипт API грузится только когда блок подходит к экрану (запас 300 px).
 * До загрузки на месте карты плашка того же размера цветом surface-2.
 *
 * Поведение: колесо мыши не масштабирует карту (страница прокручивается),
 * на телефоне одним пальцем прокручивается страница, карту двигают двумя
 * пальцами или кнопками +/−. Других элементов управления нет; копирайт
 * и логотип Яндекса остаются — это условие API.
 *
 * Позже над картой появятся карточки «Наши работы» — место под них
 * оставлено (слот WORKS_SLOT).
 */
const KEY = import.meta.env.VITE_YMAPS_KEY || ''

const KIROV = OBJECTS.find((p) => p.group === 'kirov')
const OBLAST = OBJECTS.filter((p) => p.group === 'oblast')
const FAR = OBJECTS.filter((p) => p.group === 'far')

/** Начальный вид — вся Кировская область по точкам kirov и oblast, с запасом. */
const HOME_BOUNDS = (() => {
  const pts = [KIROV, ...OBLAST]
  const lats = pts.map((p) => p.lat)
  const lons = pts.map((p) => p.lon)
  const pad = 0.35
  return [
    [Math.min(...lons) - pad, Math.max(...lats) + pad],
    [Math.max(...lons) + pad, Math.min(...lats) - pad],
  ]
})()

/** Приглушённый стиль карты в тон сайту: бежево-серая подложка, меньше подписей и POI. */
const MAP_STYLE = [
  { tags: { any: ['land', 'landscape', 'admin', 'land_cover'] }, elements: 'geometry', stylers: [{ color: 'efe6da' }] },
  { tags: { any: ['vegetation', 'park', 'national_park', 'cemetery'] }, elements: 'geometry', stylers: [{ color: 'e6dfd0' }] },
  { tags: { any: ['water', 'bathing_place'] }, elements: 'geometry', stylers: [{ color: 'd6cfc2' }] },
  { tags: { any: ['road', 'path'] }, elements: 'geometry', stylers: [{ color: 'e2d8c8' }] },
  { tags: { any: ['road', 'path'] }, elements: 'label', stylers: [{ visibility: 'off' }] },
  { tags: { any: ['poi', 'transit', 'building', 'entrance', 'traffic_light', 'structure', 'address'] }, stylers: [{ visibility: 'off' }] },
  { tags: { any: ['water'] }, elements: 'label', stylers: [{ visibility: 'off' }] },
  { elements: 'label.text.fill', stylers: [{ color: '6e7a6a' }] },
  { elements: 'label.text.outline', stylers: [{ color: 'f4eadf', opacity: 0.8 }] },
  { tags: { any: ['admin'] }, elements: 'geometry.outline', stylers: [{ color: 'b9b1a3' }] },
]

const CONTROLS_MODULE = '@yandex/ymaps3-controls@0.0.1'

/** DOM-элемент точки: золотой кружок с обводкой, подпись по клику. */
function makePoint(place, isKirov) {
  const label = isKirov ? KIROV_LABEL : place.name
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `bv-map-point${isKirov ? ' bv-map-point--big' : ''}`
  el.setAttribute('aria-label', label)
  if (isKirov) el.textContent = '15+'
  const tip = document.createElement('span')
  tip.className = 'bv-map-tip'
  tip.textContent = label
  el.appendChild(tip)
  return el
}

export default function SectionMap() {
  const wrapRef = useRef(null)
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const [status, setStatus] = useState(KEY ? 'idle' : 'nokey') // idle | ready | failed | nokey
  // Флаг «пора грузить» переключается один раз; инициализация привязана к нему,
  // а не к status — иначе смена статуса перезапускала бы эффект и уничтожала карту.
  const [shouldLoad, setShouldLoad] = useState(false)

  // Загрузка API, когда блок подходит к экрану
  useEffect(() => {
    if (!KEY) return undefined
    const el = wrapRef.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Инициализация карты — один раз, после shouldLoad
  useEffect(() => {
    if (!shouldLoad) return undefined
    let cancelled = false
    let openPoint = null

    async function init() {
      const ymaps3 = await loadYmaps(KEY)
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapControls } = ymaps3
      const { YMapZoomControl } = await ymaps3.import(CONTROLS_MODULE)
      if (cancelled || !mapEl.current) return

      const coarse = window.matchMedia('(pointer: coarse)').matches
      const map = new YMap(mapEl.current, {
        location: { bounds: HOME_BOUNDS },
        // Без scrollZoom: колесо прокручивает страницу. На телефоне без drag:
        // одним пальцем прокручивается страница, двумя — двигают и масштабируют карту.
        behaviors: coarse ? ['pinchZoom', 'dblClick'] : ['drag', 'dblClick'],
        margin: [24, 24, 24, 24],
        copyrightsPosition: 'bottom right',
      })
      map.addChild(new YMapDefaultSchemeLayer({ theme: 'light', customization: MAP_STYLE }))
      map.addChild(new YMapDefaultFeaturesLayer({}))
      map.addChild(new YMapControls({ position: 'right' }).addChild(new YMapZoomControl({})))

      for (const place of OBJECTS) {
        const isKirov = place.group === 'kirov'
        const el = makePoint(place, isKirov)
        map.addChild(
          new YMapMarker(
            {
              coordinates: [place.lon, place.lat],
              onClick: () => {
                if (openPoint && openPoint !== el) openPoint.classList.remove('is-open')
                el.classList.toggle('is-open')
                openPoint = el.classList.contains('is-open') ? el : null
                track('map_point_click', { name: place.name })
              },
            },
            el,
          ),
        )
      }

      mapRef.current = map
      setStatus('ready')
      track('map_view')
    }

    init().catch(() => {
      if (!cancelled) setStatus('failed')
    })
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
  }, [shouldLoad])

  function flyTo(place) {
    mapRef.current?.setLocation({ center: [place.lon, place.lat], zoom: 9, duration: 700 })
    track('map_far_click', { name: place.name })
  }
  function goHome() {
    mapRef.current?.setLocation({ bounds: HOME_BOUNDS, duration: 700 })
  }

  const showMap = status !== 'nokey' && status !== 'failed'

  return (
    <section id="map" aria-labelledby="map-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="map-title" className="text-center text-heading">
          Где стоят наши бани
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">
          От Кирово-Чепецка до Нарьян-Мара — больше 300 Подков с 2019 года. На карте — места, где мы ставили бани
          в последние два года.
        </p>

        {/* WORKS_SLOT: сюда позже встанут карточки «Наши работы», над картой */}

        <div ref={wrapRef} className="mt-12 md:mt-16">
          {showMap && (
            <>
              {/* До загрузки — плашка того же размера цветом surface-2, без спиннера */}
              <div
                ref={mapEl}
                className="h-[360px] overflow-hidden rounded-md bg-surface-2 lg:h-[480px]"
                aria-label="Карта: где стоят наши бани"
                role={status === 'ready' ? undefined : 'img'}
              />
              {status === 'ready' && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-body">
                  <p>
                    <span className="text-muted">А ещё: </span>
                    {FAR.map((place, i) => (
                      <span key={place.name}>
                        {i > 0 && ', '}
                        <button type="button" onClick={() => flyTo(place)} className="underline decoration-muted underline-offset-4">
                          {place.name}
                        </button>
                      </span>
                    ))}
                  </p>
                  <button type="button" onClick={goHome} className="text-label text-muted underline underline-offset-4">
                    Вся Кировская область
                  </button>
                </div>
              )}
            </>
          )}

          {/* Все места текстом: для поиска и как запасной вариант без карты */}
          <ul className={`list-none columns-2 gap-x-8 p-0 text-label leading-[1.6] text-muted md:columns-3 ${showMap ? 'mt-8' : ''}`}>
            <li>{KIROV_LABEL}</li>
            {OBLAST.map((place) => (
              <li key={place.name}>{place.name}</li>
            ))}
            {FAR.map((place) => (
              <li key={place.name}>
                {place.name} ({place.region === 'Республика Коми' ? 'Коми' : place.region})
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
