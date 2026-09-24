import { useEffect, useRef, useState } from 'react'
import { OBJECTS, KIROV_LABEL, PLACES_LINE } from '../../data/objects.js'
import { loadYmaps } from '../../lib/ymaps.js'
import { track } from '../../lib/track.js'
import { requestCalcOpen } from '../../lib/calc.js'
import Button from '../Button.jsx'

/**
 * Карта «Где стоят наши бани» — нижняя, тёмная (ink) часть блока «Наши
 * работы» (SectionWorks): маленький заголовок, подзаголовок, карта, строка
 * «А ещё» и одна строка главных мест мелким шрифтом. Текст surface,
 * второстепенный muted-on-dark.
 * Раньше была отдельным экраном; карта, данные, поведение и цели те же.
 *
 * Карта — Яндекс Карты, JavaScript API v3. Ключ из VITE_YMAPS_KEY (сборка).
 * Без ключа, без сети, при исчерпанном лимите или ошибке API карты нет:
 * вместо подзаголовка и карты — текст о том, где стоят бани, и главная
 * кнопка «Рассчитать доставку» в калькулятор (цель map_fallback_cta). Что
 * карта не загрузилась, человеку не пишем.
 *
 * Скрипт API грузится только когда блок подходит к экрану (запас 300 px)
 * и один раз за визит: тариф бесплатный, лимит загрузок в сутки небольшой.
 * До загрузки на месте карты плашка того же размера цветом surface-2.
 *
 * Почему карты нет — видно в консоли браузера, значение ключа не печатается:
 *   «Карта: ключ не передан в сборку»
 *   «Карта: скрипт Яндекса не загрузился …»
 *   «Карта: ошибка API — <текст ошибки>»
 *
 * Начальный вид (START_BOUNDS) — рамка по Кирову, Кирово-Чепецку,
 * Слободскому, Кумёнам и Нолинску: примерно вдвое крупнее общего вида
 * (в 2,07 раза на любой ширине), центр на ~50 км южнее Кирова —
 * иначе Нолинск не помещается. «Вся Кировская область» возвращает общий
 * вид по всем точкам области (HOME_BOUNDS).
 *
 * Поведение: колесо мыши не масштабирует карту (страница прокручивается).
 * На телефоне до первого касания карта не двигается одним пальцем — палец
 * прокручивает страницу, — а поверх лежит полупрозрачная подложка с
 * подсказкой «Нажмите, чтобы двигать карту». После касания (тап, не
 * прокрутка) подложка исчезает и карта двигается одним пальцем. Подсказка
 * один раз за визит (sessionStorage): при повторном показе в том же визите
 * карта сразу двигается. На компьютере подложки нет. Из элементов
 * управления только +/−; копирайт и логотип Яндекса остаются — условие API.
 */
const KEY = import.meta.env.VITE_YMAPS_KEY || ''

const KIROV = OBJECTS.find((p) => p.group === 'kirov')
const OBLAST = OBJECTS.filter((p) => p.group === 'oblast')
const FAR = OBJECTS.filter((p) => p.group === 'far')

/** Общий вид («Вся Кировская область») — все точки kirov и oblast, с запасом. */
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

/**
 * Приглушённый стиль карты в тон сайту: бежево-серая суша, меньше подписей и POI.
 * Каждое правило адресовано конкретным типам объектов (tags) — общего правила
 * на всю карту нет, иначе подложка закрасится одним цветом. Границы (admin)
 * только линией, без заливки.
 */
const MAP_STYLE = [
  { tags: { any: ['land', 'landscape', 'land_cover'] }, elements: 'geometry', stylers: [{ color: 'efe6da' }] },
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

const MAP_MARGIN = 24 // поля карты, как в опции margin YMap

/** Меркатор: вертикальная координата широты. */
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))

/** Начальный вид: Киров и ближайшие ориентиры, с запасом от краёв. */
const START_BOUNDS = (() => {
  const names = ['Киров и пригороды', 'Кирово-Чепецк', 'Слободской', 'Кумёны', 'Нолинск']
  const pts = names.map((name) => OBJECTS.find((p) => p.name === name))
  const lats = pts.map((p) => p.lat)
  const lons = pts.map((p) => p.lon)
  return [
    [Math.min(...lons) - 0.2, Math.max(...lats) + 0.12],
    [Math.max(...lons) + 0.2, Math.min(...lats) - 0.12],
  ]
})()

/**
 * Подсказка — по центру по горизонтали, по высоте на свободной полосе между
 * Кумёнами (58,11°) и Нолинском (57,56°): в центре кадра стоят Кумёны. В рамке
 * START_BOUNDS карта вписывается по высоте (на 1440 и на телефоне), поэтому
 * доля высоты считается от её севера и юга.
 */
const HINT_LAT = 57.84
const HINT_TOP = (() => {
  const [[, north], [, south]] = START_BOUNDS
  const frac = (mercY(north) - mercY(HINT_LAT)) / (mercY(north) - mercY(south))
  return `calc(${MAP_MARGIN}px + (100% - ${2 * MAP_MARGIN}px) * ${frac.toFixed(3)})`
})()

/** Подсказка «Нажмите, чтобы двигать карту» — один раз за визит. */
const HINT_KEY = 'bv_map_hint_seen'
function hintSeen() {
  try {
    return sessionStorage.getItem(HINT_KEY) === '1'
  } catch {
    return false
  }
}
function rememberHint() {
  try {
    sessionStorage.setItem(HINT_KEY, '1')
  } catch {
    /* хранилище недоступно — подсказка просто покажется снова */
  }
}

const DRAG_BEHAVIORS = ['drag', 'pinchZoom', 'dblClick']

/** Сообщение в консоль о том, почему карты нет. Ключ в сообщение не попадает. */
function reportMapError(err) {
  const detail = err?.message ? ` — ${err.message}` : ''
  if (err?.code === 'script' || err?.code === 'timeout') {
    console.error(`Карта: скрипт Яндекса не загрузился${detail}`)
  } else {
    console.error(`Карта: ошибка API${detail}`)
  }
}

let warnedNoKey = false

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

export default function MapBlock() {
  const wrapRef = useRef(null)
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const [status, setStatus] = useState(KEY ? 'idle' : 'nokey') // idle | ready | failed | nokey
  // Флаг «пора грузить» переключается один раз; инициализация привязана к нему,
  // а не к status — иначе смена статуса перезапускала бы эффект и уничтожала карту.
  const [shouldLoad, setShouldLoad] = useState(false)
  // Подложка с подсказкой на телефоне, пока карта не двигается одним пальцем
  const [hint, setHint] = useState(false)
  const tapRef = useRef(null)

  // Загрузка API, когда блок подходит к экрану
  useEffect(() => {
    if (!KEY) {
      if (!warnedNoKey) {
        warnedNoKey = true
        console.warn('Карта: ключ не передан в сборку (VITE_YMAPS_KEY пуст) — показан текст вместо карты')
      }
      return undefined
    }
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
      // Кнопки +/− — отдельный модуль; если он не загрузился, карта всё равно нужна
      let YMapZoomControl = null
      try {
        ;({ YMapZoomControl } = await ymaps3.import(CONTROLS_MODULE))
      } catch (e) {
        console.warn(`Карта: кнопки +/− не загрузились — ${e?.message || e}`)
      }
      if (cancelled || !mapEl.current) return

      const coarse = window.matchMedia('(pointer: coarse)').matches
      // На телефоне до первого касания без drag: одним пальцем прокручивается страница
      const waitTap = coarse && !hintSeen()
      const map = new YMap(mapEl.current, {
        location: { bounds: START_BOUNDS },
        zoomRounding: 'smooth',
        // Без scrollZoom: колесо прокручивает страницу
        behaviors: !coarse ? ['drag', 'dblClick'] : waitTap ? ['pinchZoom', 'dblClick'] : DRAG_BEHAVIORS,
        margin: [MAP_MARGIN, MAP_MARGIN, MAP_MARGIN, MAP_MARGIN],
        copyrightsPosition: 'bottom right',
      })
      // Подложка (тайлы схемы) обязательна — без неё будут только точки на пустом поле
      map.addChild(new YMapDefaultSchemeLayer({ theme: 'light', customization: MAP_STYLE }))
      map.addChild(new YMapDefaultFeaturesLayer({}))
      if (YMapZoomControl) {
        map.addChild(new YMapControls({ position: 'right' }).addChild(new YMapZoomControl({})))
      }

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
      if (waitTap) setHint(true)
      setStatus('ready')
      track('map_view')
    }

    init().catch((err) => {
      reportMapError(err)
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

  // Касание карты (тап, а не начало прокрутки) снимает подложку и включает drag.
  // Прокрутку страницы браузер начинает с pointercancel — такое касание не считается.
  function unlockDrag() {
    const map = mapRef.current
    if (map) {
      if (typeof map.setBehaviors === 'function') map.setBehaviors(DRAG_BEHAVIORS)
      else map.update({ behaviors: DRAG_BEHAVIORS })
    }
    rememberHint()
    setHint(false)
  }
  const tapHandlers = hint
    ? {
        onPointerDownCapture: (e) => {
          tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now() }
        },
        onPointerCancelCapture: () => {
          tapRef.current = null
        },
        onPointerUpCapture: (e) => {
          const start = tapRef.current
          tapRef.current = null
          if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 10 && Date.now() - start.t < 700) {
            unlockDrag()
          }
        },
      }
    : {}

  function fallbackCta() {
    track('map_fallback_cta')
    requestCalcOpen()
  }

  const showMap = status !== 'nokey' && status !== 'failed'

  return (
    <div id="map" aria-labelledby="map-title">
      <h3 id="map-title" className="text-center text-[22px] font-bold leading-[1.2]">
        Где стоят наши бани
      </h3>

      {showMap ? (
        <>
          <p className="mx-auto mt-3 max-w-measure text-center text-body">
            Возим и ставим бани по Кировской области, в Коми и дальше — от Краснодара до Нарьян-Мара. На карте —
            места, где стоят наши бани.
          </p>

          <div ref={wrapRef} className="mt-8 md:mt-10">
            <div className="relative" {...tapHandlers}>
              {/* До загрузки — чуть светлее фона плашка того же размера, без спиннера */}
              <div
                ref={mapEl}
                className="h-[360px] overflow-hidden rounded-md bg-[rgba(244,234,223,0.06)] lg:h-[480px]"
                aria-label="Карта: где стоят наши бани"
                role={status === 'ready' ? undefined : 'img'}
              />
              {/* Подложка с подсказкой (только телефон, до первого касания). Касания проходят
                  сквозь неё: страница прокручивается, кнопки +/− и точки нажимаются.
                  Подсказка по центру, на свободной полосе между Кумёнами и Нолинском. */}
              {hint && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-md bg-[rgba(26,21,18,0.3)]">
                  <span
                    className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[rgba(26,21,18,0.88)] px-4 py-2 text-label text-surface"
                    style={{ top: HINT_TOP }}
                  >
                    Нажмите, чтобы двигать карту
                  </span>
                </div>
              )}
            </div>
            {status === 'ready' && (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-body">
                <p>
                  <span className="text-muted-on-dark">А ещё: </span>
                  {/* Запятая приклеена к месту, чтобы при переносе не начинать с неё строку */}
                  {FAR.map((place, i) => (
                    <span key={place.name}>
                      <span className="whitespace-nowrap">
                        <Button variant="link" size="md" onClick={() => flyTo(place)} className="font-normal">
                          {place.name}
                        </Button>
                        {i < FAR.length - 1 && ','}
                      </span>{' '}
                    </span>
                  ))}
                </p>
                <Button variant="link" size="sm" onClick={goHome}>
                  Вся Кировская область
                </Button>
              </div>
            )}

            {/* Главные места одной строкой; остальные — только точками на карте.
                Точка-разделитель приклеена к предыдущему месту неразрывным пробелом. */}
            <p className="mt-6 max-w-measure text-label leading-[1.6] text-muted-on-dark">{PLACES_LINE.join('\u00a0· ')}</p>
          </div>
        </>
      ) : (
        // Запасной вариант без карты: текст и кнопка в калькулятор, о карте ни слова
        <div className="mx-auto mt-4 flex max-w-measure flex-col items-center text-center">
          <p className="text-body">
            С 2012 года мы поставили больше 1000 бань. Больше всего — в Кирове и Кировской области, а ещё в Коми
            и Ненецком округе, в Москве, Казани и Краснодаре. Скажите, где ваш участок, — посчитаем доставку.
          </p>
          <Button arrow fullMobile className="mt-8" onClick={fallbackCta}>
            Рассчитать доставку
          </Button>
        </div>
      )}
    </div>
  )
}
