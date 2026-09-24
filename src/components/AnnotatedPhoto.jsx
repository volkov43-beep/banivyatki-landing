import { useEffect, useRef, useState } from 'react'
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
