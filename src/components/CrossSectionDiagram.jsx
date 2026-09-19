import { useId, useLayoutEffect, useRef } from 'react'

/*
 * Схема «Подкова против бочки» — два поперечных сечения, нарисованных как чертёж.
 *
 * Обе фигуры лежат в одинаковом viewBox и в одном масштабе: 1 user unit = 10 мм.
 * Линия земли для обеих — y = 280. Контуры — surface, толщина 2 px;
 * размерные линии — accent, толщина 1 px; проблемное место (трапик) — alert-on-dark;
 * подписи — muted-on-dark; силуэт человека — заливка muted-on-dark, рост 1750 мм.
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

const TONE_STROKE = { accent: 'stroke-accent', alert: 'stroke-alert-on-dark' }
const TONE_FILL = { accent: 'fill-accent', alert: 'fill-alert-on-dark', muted: 'fill-muted-on-dark' }

/** Наконечники размерных линий. Один маркер на цвет. */
function ArrowMarkers({ id }) {
  const marker = (tone) => (
    <marker
      key={tone}
      id={`${id}-${tone}`}
      viewBox="0 0 10 10"
      refX="10"
      refY="5"
      markerWidth="9"
      markerHeight="9"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M0,1 L10,5 L0,9 Z" className={TONE_FILL[tone]} />
    </marker>
  )
  return <defs>{['accent', 'alert'].map(marker)}</defs>
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
      className={TONE_STROKE[tone]}
      strokeWidth="1"
      vectorEffect="non-scaling-stroke"
      markerStart={markerRef}
      markerEnd={markerRef}
    />
  )
}

/** Подпись на схеме. Через rotate можно положить вдоль вертикальной размерной линии. */
function Label({ x, y, tone = 'muted', vertical = false, children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}
      className={`dg-label ${TONE_FILL[tone]}`}
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
 * Условный силуэт человека, рост 1750 мм (175 единиц). Ступни в точке (x, y).
 * Один и тот же компонент в обеих фигурах — сравнение честное.
 */
function Person({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} className="fill-muted-on-dark" aria-hidden="true">
      <circle cx="0" cy="-164" r="11" />
      <rect x="-3.5" y="-154" width="7" height="8" />
      {/* Корпус с руками вдоль тела */}
      <path d="M-22,-143 C-22,-147 -19,-149 -15,-149 H15 C19,-149 22,-147 22,-143 L19,-88 H-19 Z" />
      {/* Ноги */}
      <path d="M-19,-88 H-3 L-3,0 H-17 Z" />
      <path d="M3,-88 H19 L17,0 H3 Z" />
    </g>
  )
}

/**
 * Баня-бочка. Окружность внутренним диаметром 2000 мм (r = 100),
 * центр (150, 180), низ на линии земли y = 280.
 * Трапик — настил шириной 400 мм на опорах у самого дна, поверхность на y = 262.
 * Человек стоит на трапике: голова у верхней дуги, ступни занимают весь настил.
 */
function Barrel({ markerId }) {
  return (
    <>
      {/* Корпус */}
      <circle cx="150" cy="180" r="100" {...contour} />

      {/* Человек рисуется до настила, чтобы линия настила проходила под ступнями */}
      <Person x={150} y={262} />

      {/* Трапик: настил из трёх досок на двух опорах */}
      <rect x="134" y="268" width="5" height="11" {...contour} />
      <rect x="161" y="268" width="5" height="11" {...contour} />
      <rect x="130" y="262" width="40" height="6" {...contour} />
      <line x1="143.3" y1="262" x2="143.3" y2="268" {...contour} strokeWidth="1" />
      <line x1="156.7" y1="262" x2="156.7" y2="268" {...contour} strokeWidth="1" />
      {/* Поверхность настила подчёркнута цветом проблемного места */}
      <line
        x1="130"
        y1="262"
        x2="170"
        y2="262"
        className="stroke-alert-on-dark"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />

      {/* Диаметр 2000 мм — сверху */}
      <Thin x1="50" y1="177" x2="50" y2="30" />
      <Thin x1="250" y1="177" x2="250" y2="30" />
      <Thin x1="50" y1="34" x2="250" y2="34" arrows markerId={markerId} />
      <Label x="150" y="24">
        2000 мм
      </Label>

      {/* Высота над головой — от уровня настила до дуги, слева от человека */}
      <Thin x1="130" y1="262" x2="114" y2="262" />
      <Thin x1="118" y1="262" x2="118" y2="86" arrows markerId={markerId} />
      <Label x="110" y="174" vertical>
        высота над головой
      </Label>

      {/* Ширина трапика — проблемное место */}
      <Thin x1="130" y1="283" x2="130" y2="302" tone="alert" />
      <Thin x1="170" y1="283" x2="170" y2="302" tone="alert" />
      <Thin x1="130" y1="298" x2="170" y2="298" tone="alert" arrows markerId={markerId} />
      <Label x="150" y="318" tone="alert">
        трапик 40 см
      </Label>
    </>
  )
}

/**
 * Подкова. Наружный контур: ширина 2400 мм в «пузе» (x 30..270 на y = 170),
 * высота 2300 мм (y 50..280), верх — полукруг r = 120, ниже стенки дугой
 * сходятся к основанию шириной 2100 мм (x 45..255).
 * Внутренний контур: пол 2000 мм на всю ширину (x 50..250) на y = 272,
 * в «пузе» 2300 мм (x 35..265), верх — полукруг r = 115.
 * Человек стоит на прямом полу, по бокам остаётся место.
 */
function Horseshoe({ markerId }) {
  return (
    <>
      {/* Наружный контур */}
      <path d="M45,280 C36,255 30,215 30,170 A120,120 0 0 1 270,170 C270,215 264,255 255,280 Z" {...contour} />
      {/* Внутренний контур с плоским полом */}
      <path d="M50,272 C41,250 35,212 35,170 A115,115 0 0 1 265,170 C265,212 259,250 250,272 Z" {...contour} />

      <Person x={150} y={272} />

      {/* Наружная ширина 2400 мм — сверху */}
      <Thin x1="30" y1="167" x2="30" y2="30" />
      <Thin x1="270" y1="167" x2="270" y2="30" />
      <Thin x1="30" y1="34" x2="270" y2="34" arrows markerId={markerId} />
      <Label x="150" y="24">
        2400 мм
      </Label>

      {/* Высота 2300 мм — справа */}
      <Thin x1="156" y1="50" x2="300" y2="50" />
      <Thin x1="259" y1="280" x2="300" y2="280" />
      <Thin x1="294" y1="50" x2="294" y2="280" arrows markerId={markerId} />
      <Label x="314" y="165" vertical>
        2300 мм
      </Label>

      {/* Пол 2000 мм — снизу, accent: главная цифра правой фигуры */}
      <Thin x1="50" y1="283" x2="50" y2="302" />
      <Thin x1="250" y1="283" x2="250" y2="302" />
      <Thin x1="50" y1="298" x2="250" y2="298" arrows markerId={markerId} />
      <Label x="150" y="318" tone="accent">
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
        desc="Окружность диаметром 2000 мм. Человек ростом 1750 мм стоит на узком трапике шириной 40 см у самого дна, голова почти у верхней дуги. Пол круглый, шагнуть вбок некуда."
      >
        {(id) => <Barrel markerId={id} />}
      </Figure>
      <Figure
        caption="Подкова"
        title="Сечение бани-подковы"
        desc="Арка шириной 2400 мм и высотой 2300 мм, стенки дугой сходятся к полу. Прямой пол шириной 2000 мм на всю ширину. Тот же человек стоит свободно, по бокам остаётся место."
      >
        {(id) => <Horseshoe markerId={id} />}
      </Figure>
    </div>
  )
}
