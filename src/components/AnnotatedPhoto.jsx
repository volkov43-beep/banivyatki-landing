import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useUnitScale } from './diagrams/Diagram.jsx'
import { photoSrc } from './ResponsivePhoto.jsx'

/**
 * Фото с пометкой поверх — один SVG с общим viewBox в размер картинки
 * (1280 × 960, 4:3): внутри <image>, поверх линии и текст (children),
 * поэтому пометка масштабируется вместе со снимком. Сам снимок не
 * меняется. Текст держит заданный размер в px через --s (см. Diagram.jsx).
 *
 * У SVG <image> нет srcset и loading="lazy": файл (<name>-640 или -1280)
 * выбирается по ширине на экране × плотности, как это сделал бы srcset,
 * и ставится, когда фото подходит к экрану. Пока снимок не загрузился,
 * вместо него плашка surface-2, пометки не видно.
 *
 * Подпись на снимке — PhotoTag: плашка forest с текстом surface.
 */
const WIDTHS = [640, 1280]

export default function AnnotatedPhoto({ name, alt, width = 1280, height = 960, children }) {
  const ref = useRef(null)
  useUnitScale(ref, width)

  const [href, setHref] = useState()
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const pick = () => {
      const need = el.getBoundingClientRect().width * (window.devicePixelRatio || 1)
      const w = WIDTHS.find((x) => x >= need) || WIDTHS[WIDTHS.length - 1]
      setHref(photoSrc(name, w))
    }
    if (typeof IntersectionObserver === 'undefined') {
      pick()
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          pick()
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [name])

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={alt}
      className="block h-auto w-full rounded-md bg-surface-2"
    >
      <image href={href} x="0" y="0" width={width} height={height} onLoad={() => setLoaded(true)} />
      {loaded && children}
    </svg>
  )
}

/**
 * Плашка-подпись на фото: фон forest, скругление 4 px, отступы 4 × 10 px,
 * текст surface Onest 700 14 px. Точка привязки (x, y) — середина нижнего
 * края плашки, отсюда удобно вести выноску вниз.
 *
 * Размеры заданы в единицах viewBox при ширине фото REF_WIDTH (карточка на
 * 1440 — 528 px). На более узком фото плашка растёт в единицах так, чтобы
 * на экране оставаться 14 px, но не больше чем в maxScale раз: дальше она
 * уменьшается вместе с картинкой и не выходит из свободного места кадра.
 * Ширина плашки — по измеренной длине текста (шрифт мог не загрузиться).
 */
const REF_WIDTH = 528

export function PhotoTag({ x, y, children, viewWidth = 1280, maxScale = 1.8 }) {
  const s0 = REF_WIDTH / viewWidth
  const font = 14 / s0
  const padX = 10 / s0
  const padY = 4 / s0
  const height = font * 1.2 + 2 * padY

  const textRef = useRef(null)
  const [textWidth, setTextWidth] = useState(0)
  useLayoutEffect(() => {
    const measure = () => textRef.current && setTextWidth(textRef.current.getComputedTextLength())
    measure()
    document.fonts?.ready.then(measure)
  }, [children])

  const width = textWidth + 2 * padX
  return (
    <g transform={`translate(${x} ${y})`}>
      <g style={{ transform: `scale(min(${maxScale}, calc(${s0} / var(--s, ${s0}))))` }}>
        {textWidth > 0 && (
          <rect x={-width / 2} y={-height} width={width} height={height} rx={4 / s0} className="fill-forest" />
        )}
        <text
          ref={textRef}
          x="0"
          y={-height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-surface"
          style={{ fontSize: font, fontWeight: 700, visibility: textWidth > 0 ? 'visible' : 'hidden' }}
        >
          {children}
        </text>
      </g>
    </g>
  )
}
