import { useEffect, useRef, useState } from 'react'
import { useUnitScale } from './Diagram.jsx'

const BASE = import.meta.env.BASE_URL

/** Шаг строк подписи в единицах viewBox: ≈14 px при ширине карточки 440 (1024), ≈17 px при 528 (1440). */
export const LINE = 46
const DOT_R = 7 // точка выноски, единицы viewBox (≈2–3 px)
const BADGE_R = 46 // кружок с номером на телефоне (≈11 px при ширине 342)

/**
 * Готовый чертёж (WebP с прозрачностью) и подписи поверх него — один SVG
 * с общим viewBox в размер картинки, поэтому подписи масштабируются вместе
 * с рисунком и не съезжают. Текст держит 14 px на экране через --s
 * (см. Diagram.jsx), выноски — 1.5 px accent с точкой у рисунка.
 *
 * До 600 px текст на рисунке был бы слишком мелким: вместо подписей —
 * золотые номера в кружках, а тексты списком под картинкой.
 *
 * Картинка подгружается лениво: href ставится, когда svg подходит к экрану.
 *
 * labels: [{ n, x, y, lines, anchor, leader: { from: [x, y], to: [x, y] }, badge: [x, y] }]
 *   x, y — начало первой строки (baseline); lines — строки текста;
 *   leader — выноска от подписи к точке на рисунке; badge — центр кружка с номером.
 * footer — необязательная строка сразу под картинкой (подписи «бочка / Подкова»).
 */
export default function LabeledDrawing({ src, width, height, label, labels, footer }) {
  const ref = useRef(null)
  useUnitScale(ref, width)

  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <figure className="m-0">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
        className="block h-auto w-full"
      >
        <image href={near ? `${BASE}${src}` : undefined} x="0" y="0" width={width} height={height} />

        {labels.map((item) => (
          <g key={item.n}>
            {item.leader && (
              <>
                <line
                  x1={item.leader.from[0]}
                  y1={item.leader.from[1]}
                  x2={item.leader.to[0]}
                  y2={item.leader.to[1]}
                  className="stroke-accent"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <circle cx={item.leader.to[0]} cy={item.leader.to[1]} r={DOT_R} className="fill-accent" />
              </>
            )}

            {/* Подписи текстом — от 600 px */}
            <g className="hidden min-[600px]:block">
              {item.lines.map((line, i) => (
                <text
                  key={line}
                  x={item.x}
                  y={item.y + i * LINE}
                  textAnchor={item.anchor || 'start'}
                  className="dg-label fill-muted-on-dark"
                >
                  {line}
                </text>
              ))}
            </g>

            {/* Номера в кружках — до 600 px */}
            <g className="min-[600px]:hidden">
              <circle cx={item.badge[0]} cy={item.badge[1]} r={BADGE_R} className="fill-accent" />
              <text
                x={item.badge[0]}
                y={item.badge[1]}
                textAnchor="middle"
                dominantBaseline="central"
                className="dg-label fill-ink"
                style={{ fontSize: 'calc(12px / var(--s, 1))', fontWeight: 700 }}
              >
                {item.n}
              </text>
            </g>
          </g>
        ))}
      </svg>

      {footer}

      {/* Список подписей под картинкой — до 600 px */}
      <ol className="mt-3 flex list-none flex-col gap-1.5 p-0 text-label text-muted-on-dark min-[600px]:hidden">
        {labels.map((item) => (
          <li key={item.n} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold leading-none text-ink"
            >
              {item.n}
            </span>
            <span>{item.lines.join(' ')}</span>
          </li>
        ))}
      </ol>
    </figure>
  )
}
