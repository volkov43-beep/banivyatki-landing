import { useId, useLayoutEffect, useRef } from 'react'

/*
 * Схема «Подкова против бочки» — два поперечных сечения, нарисованных как чертёж.
 *
 * Обе фигуры лежат в одинаковом viewBox и в одном масштабе: 1 user unit = 10 мм.
 * Линия земли для обеих — y = 280. Контуры — surface, толщина 2 px;
 * размерные линии — accent (или alert для проблемного места), толщина 1 px.
 * Толщина линий не масштабируется (vector-effect), а размер подписей
 * пересчитывается через CSS-переменную --s, чтобы на экране всегда было 14 px.
 */

const VIEW_W = 360
const VIEW_H = 330

/** Держит --s = (ширина на экране) / (ширина viewBox), чтобы подписи не масштабировались. */
function useUnitScale(ref) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) el.style.setProperty('--s', String(width / VIEW_W))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
}

/** Наконечники размерных линий. Один маркер на цвет. */
function ArrowMarkers({ id }) {
  const marker = (suffix, fillClass) => (
    <marker
      id={`${id}-${suffix}`}
      viewBox="0 0 10 10"
      refX="10"
      refY="5"
      markerWidth="9"
      markerHeight="9"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M0,1 L10,5 L0,9 Z" className={fillClass} />
    </marker>
  )
  return (
    <defs>
      {marker('accent', 'fill-accent')}
      {marker('alert', 'fill-alert')}
    </defs>
  )
}

/** Тонкая линия чертежа (размерная или выносная). */
function Thin({ x1, y1, x2, y2, tone = 'accent', arrows = false, markerId }) {
  const markerRef = arrows ? `url(#${markerId}-${tone})` : undefined
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={tone === 'alert' ? 'stroke-alert' : 'stroke-accent'}
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
      markerStart={markerRef}
      markerEnd={markerRef}
    />
  )
}

/** Подпись на схеме. Через rotate можно положить вдоль вертикальной размерной линии. */
function Label({ x, y, tone = 'accent', vertical = false, children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}
      className={`dg-label ${tone === 'alert' ? 'fill-alert' : 'fill-accent'}`}
    >
      {children}
    </text>
  )
}

const contour = {
  className: 'stroke-surface',
  fill: 'none',
  strokeWidth: 2,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
  vectorEffect: 'non-scaling-stroke',
}

/**
 * Баня-бочка. Окружность внутренним диаметром 2000 мм (r = 100),
 * центр (150, 180), низ на линии земли y = 280.
 * Трапик — узкая горизонтальная доска 400 мм на коротких опорах у самого дна.
 */
function Barrel({ markerId }) {
  return (
    <>
      {/* Корпус */}
      <circle cx="150" cy="180" r="100" {...contour} />
      {/* Трапик 40 см: узкая доска x 130..170 на коротких опорах, верх на y = 264 */}
      <rect x="130" y="264" width="40" height="5" {...contour} />
      <line x1="135" y1="269" x2="135" y2="278.9" {...contour} />
      <line x1="165" y1="269" x2="165" y2="278.9" {...contour} />

      {/* Диаметр 2000 мм — сверху */}
      <Thin x1="50" y1="177" x2="50" y2="30" />
      <Thin x1="250" y1="177" x2="250" y2="30" />
      <Thin x1="50" y1="34" x2="250" y2="34" arrows markerId={markerId} />
      <Label x="150" y="24">
        2000 мм
      </Label>

      {/* Высота над головой — от трапика до верхней точки окружности */}
      <Thin x1="150" y1="264" x2="150" y2="80" arrows markerId={markerId} />
      <Label x="142" y="172" vertical>
        высота над головой
      </Label>

      {/* Ширина трапика — проблемное место, цвет alert */}
      <Thin x1="130" y1="272" x2="130" y2="302" tone="alert" />
      <Thin x1="170" y1="272" x2="170" y2="302" tone="alert" />
      <Thin x1="130" y1="298" x2="170" y2="298" tone="alert" arrows markerId={markerId} />
      <Label x="150" y="318" tone="alert">
        трапик 40 см
      </Label>
    </>
  )
}

/**
 * Подкова. Наружный контур: ширина 2400 мм (x 30..270), высота 2300 мм (y 50..280),
 * прямые стенки до y = 170, выше — полукруг r = 120.
 * Внутренний контур: пол 2000 мм на всю ширину (x 50..250) на y = 272,
 * стенки до y = 170, выше — полукруг r = 100.
 */
function Horseshoe({ markerId }) {
  return (
    <>
      {/* Наружный контур */}
      <path d="M30,280 V170 A120,120 0 0 1 270,170 V280 Z" {...contour} />
      {/* Внутренний контур с плоским полом */}
      <path d="M50,272 V170 A100,100 0 0 1 250,170 V272 Z" {...contour} />

      {/* Наружная ширина 2400 мм — сверху */}
      <Thin x1="30" y1="167" x2="30" y2="30" />
      <Thin x1="270" y1="167" x2="270" y2="30" />
      <Thin x1="30" y1="34" x2="270" y2="34" arrows markerId={markerId} />
      <Label x="150" y="24">
        2400 мм
      </Label>

      {/* Высота 2300 мм — справа */}
      <Thin x1="156" y1="50" x2="300" y2="50" />
      <Thin x1="274" y1="280" x2="300" y2="280" />
      <Thin x1="294" y1="50" x2="294" y2="280" arrows markerId={markerId} />
      <Label x="314" y="165" vertical>
        2300 мм
      </Label>

      {/* Пол 2000 мм — снизу, accent */}
      <Thin x1="50" y1="283" x2="50" y2="302" />
      <Thin x1="250" y1="283" x2="250" y2="302" />
      <Thin x1="50" y1="298" x2="250" y2="298" arrows markerId={markerId} />
      <Label x="150" y="318">
        пол 2000 мм
      </Label>
    </>
  )
}

function Figure({ caption, title, desc, children }) {
  const svgRef = useRef(null)
  const id = useId().replace(/:/g, '')
  useUnitScale(svgRef)

  return (
    <figure className="m-0 w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="block h-auto w-full"
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        shapeRendering="geometricPrecision"
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{desc}</desc>
        <ArrowMarkers id={id} />
        {children(id)}
      </svg>
      <figcaption className="mt-4 text-center text-body font-bold">{caption}</figcaption>
    </figure>
  )
}

export default function CrossSectionDiagram() {
  return (
    <div className="grid gap-12 min-[720px]:grid-cols-2 min-[720px]:gap-x-12">
      <Figure
        caption="Баня-бочка"
        title="Сечение бани-бочки"
        desc="Окружность диаметром 2000 мм. Внизу узкий трапик шириной 40 см. Пол круглый."
      >
        {(id) => <Barrel markerId={id} />}
      </Figure>
      <Figure
        caption="Подкова"
        title="Сечение бани-подковы"
        desc="Арка шириной 2400 мм и высотой 2300 мм с прямыми стенками. Прямой пол шириной 2000 мм на всю ширину."
      >
        {(id) => <Horseshoe markerId={id} />}
      </Figure>
    </div>
  )
}
