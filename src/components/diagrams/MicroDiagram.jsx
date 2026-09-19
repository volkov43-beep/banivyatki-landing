import { useId } from 'react'

/*
 * Общая обвязка для микро-схем к блокам преимуществ.
 * Та же чертёжная манера, что у главной схемы: контуры surface 2 px,
 * размерные и выносные линии accent 1 px, подписи muted-on-dark 14 px.
 * SVG рендерится ровно в размер viewBox (1 unit = 1 px), поэтому подписи
 * задаются напрямую в пикселях.
 */

export const contour = {
  className: 'stroke-surface',
  fill: 'none',
  strokeWidth: 2,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
}

export const hairline = {
  className: 'stroke-surface',
  fill: 'none',
  strokeWidth: 1,
  strokeLinecap: 'round',
}

const TONE_STROKE = { accent: 'stroke-accent', alert: 'stroke-alert-on-dark' }
const TONE_FILL = { accent: 'fill-accent', alert: 'fill-alert-on-dark', muted: 'fill-muted-on-dark' }

/** Тонкая линия: выноска или размерная. arrows: 'end' | 'both' | false. */
export function Thin({ x1, y1, x2, y2, tone = 'accent', arrows = false, markerId }) {
  const ref = arrows ? `url(#${markerId}-${tone})` : undefined
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={TONE_STROKE[tone]}
      strokeWidth="1"
      markerEnd={ref}
      markerStart={arrows === 'both' ? ref : undefined}
    />
  )
}

export function Label({ x, y, tone = 'muted', anchor = 'middle', children }) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`dg-label ${TONE_FILL[tone]}`}>
      {children}
    </text>
  )
}

/** Обёртка: svg фиксированной ширины, маркеры стрелок, доступное описание. */
export default function MicroDiagram({ width = 240, height = 150, title, desc, children }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block h-auto max-w-full"
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
      shapeRendering="geometricPrecision"
    >
      <title id={`${id}-title`}>{title}</title>
      <desc id={`${id}-desc`}>{desc}</desc>
      <defs>
        {['accent', 'alert'].map((tone) => (
          <marker
            key={tone}
            id={`${id}-${tone}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L10,5 L0,9 Z" className={TONE_FILL[tone]} />
          </marker>
        ))}
      </defs>
      {children(id)}
    </svg>
  )
}
