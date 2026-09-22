import { createContext, useContext, useId, useLayoutEffect, useRef } from 'react'

/*
 * Общий каркас чертёжных схем.
 *
 * scheme: 'dark' — на фоне ink (контуры surface, подписи muted-on-dark),
 *         'light' — на фоне surface (контуры ink, подписи ink).
 * Размерные и выносные линии в обеих схемах accent.
 *
 * scale: false — svg рендерится ровно в размер viewBox (1 unit = 1 px);
 *        true  — svg тянется на ширину контейнера, а подписи через
 *                CSS-переменную --s держат ровно 14 px на любом масштабе.
 */

const SCHEMES = {
  dark: {
    contour: 'stroke-surface',
    label: 'fill-muted-on-dark',
    accentStroke: 'stroke-accent',
    accentFill: 'fill-accent',
    alertStroke: 'stroke-alert-on-dark',
    alertFill: 'fill-alert-on-dark',
  },
  light: {
    contour: 'stroke-ink',
    label: 'fill-ink',
    accentStroke: 'stroke-accent',
    accentFill: 'fill-accent',
    alertStroke: 'stroke-alert',
    alertFill: 'fill-alert',
  },
}

const DiagramContext = createContext({ id: '', scheme: SCHEMES.dark })

export function useDiagram() {
  return useContext(DiagramContext)
}

/** Держит --s = (ширина на экране) / (ширина viewBox). */
export function useUnitScale(ref, viewWidth) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !viewWidth) return undefined
    const update = () => {
      const width = el.getBoundingClientRect().width
      if (width > 0) el.style.setProperty('--s', String(width / viewWidth))
    }
    update()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, viewWidth])
}

/** Пропсы контура: линия surface/ink, толщина в px не масштабируется. */
export function useContour(weight = 2) {
  const { scheme } = useDiagram()
  return {
    className: scheme.contour,
    fill: 'none',
    strokeWidth: weight,
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
    vectorEffect: 'non-scaling-stroke',
  }
}

/** Тонкая линия: выноска или размерная. arrows: false | 'end' | 'both'. */
export function Thin({ x1, y1, x2, y2, tone = 'accent', arrows = false, markerId, dashed = false }) {
  const { id, scheme } = useDiagram()
  const ref = arrows ? `url(#${markerId || id}-${tone})` : undefined
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={tone === 'alert' ? scheme.alertStroke : scheme.accentStroke}
      strokeWidth="1"
      strokeDasharray={dashed ? '3 3' : undefined}
      vectorEffect="non-scaling-stroke"
      markerEnd={ref}
      markerStart={arrows === 'both' || arrows === true ? ref : undefined}
    />
  )
}

/** Точка выноски на объекте. */
export function Dot({ x, y, tone = 'accent' }) {
  const { scheme } = useDiagram()
  return <circle cx={x} cy={y} r="2.5" className={tone === 'alert' ? scheme.alertFill : scheme.accentFill} />
}

/** Подпись 14 px. tone: 'muted' (цвет подписей схемы), 'accent', 'alert'. */
export function Label({ x, y, tone = 'muted', anchor = 'middle', vertical = false, size, children }) {
  const { scheme } = useDiagram()
  const fill = { accent: scheme.accentFill, alert: scheme.alertFill }[tone] || scheme.label
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}
      className={`dg-label ${fill}`}
      style={size ? { fontSize: `calc(${size}px / var(--s, 1))` } : undefined}
    >
      {children}
    </text>
  )
}

export default function Diagram({
  width,
  height,
  scale = false,
  scheme = 'dark',
  title,
  desc,
  className = '',
  children,
}) {
  const id = useId().replace(/:/g, '')
  const ref = useRef(null)
  useUnitScale(ref, scale ? width : 0)
  const s = SCHEMES[scheme]

  return (
    <DiagramContext.Provider value={{ id, scheme: s }}>
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        width={scale ? undefined : width}
        height={scale ? undefined : height}
        className={`block h-auto ${scale ? 'w-full' : 'max-w-full'} ${className}`}
        role="img"
        aria-labelledby={`${id}-title ${id}-desc`}
        shapeRendering="geometricPrecision"
      >
        <title id={`${id}-title`}>{title}</title>
        <desc id={`${id}-desc`}>{desc}</desc>
        <defs>
          {[
            ['accent', s.accentFill],
            ['alert', s.alertFill],
          ].map(([tone, fill]) => (
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
              <path d="M0,1 L10,5 L0,9 Z" className={fill} />
            </marker>
          ))}
        </defs>
        {typeof children === 'function' ? children(id) : children}
      </svg>
    </DiagramContext.Provider>
  )
}
