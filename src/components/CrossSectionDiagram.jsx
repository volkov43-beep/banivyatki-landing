import { useEffect, useId, useRef, useState } from 'react'
import { useUnitScale } from './diagrams/Diagram.jsx'

/*
 * Главная схема «Баня-бочка против Подковы».
 *
 * Рисунок — готовый чертёж diagram-sravnenie.webp (1600 × 800, прозрачный фон):
 * слева бочка на ложементах, справа Подкова на обвязке, человек одного роста,
 * внизу линия земли. Размеры и подписи ставятся поверх в том же SVG с viewBox
 * в размер картинки, поэтому масштабируются вместе с рисунком.
 *
 * Координаты ниже измерены по пикселям файла (альфа-канал и цвет контура),
 * не на глаз. Масштаб рисунка: 427 единиц = 2000 мм.
 *
 * Стиль как у остальных схем: размерные линии accent 1 px со стрелками,
 * выносные тоньше и полупрозрачные, подписи 14 px muted-on-dark через --s,
 * трапик — alert-on-dark, названия бань («Баня-бочка», «Баня-Подкова») 18 px жирные surface.
 *
 * До 600 px схема 2:1 слишком мелкая, поэтому та же картинка показывается
 * двумя SVG друг под другом: viewBox каждого вырезает свою половину
 * одинаковой ширины — масштаб общий, люди остаются одного роста.
 */

const IMG = { src: 'photos/diagram-sravnenie.webp', w: 1600, h: 800 }

/** Опорные точки рисунка (единицы viewBox = пиксели файла). */
const G = {
  ground: { top: 629, bottom: 634 }, // линия земли
  barrel: {
    cx: 400,
    left: 186, // наружный контур в самом широком месте
    right: 613,
    wideY: 374,
    innerTop: 194, // внутренний верх бочки по центру
    innerTopAtLine: 205, // внутренний контур на x = 338 (линия высоты)
    trapikLeft: 357,
    trapikRight: 443,
    trapikTop: 556,
    trapikBottom: 567,
    heightLineX: 338, // слева от человека (рука на 352)
  },
  horseshoe: {
    cx: 1126,
    left: 870, // наружный контур в самом широком месте
    right: 1382,
    wideY: 342,
    top: 77, // наружный верх свода
    floorTop: 564, // верх пола, на нём стоит человек
    innerLeft: 914, // внутренние грани стен на уровне пола
    innerRight: 1338,
    outerRightAtFloor: 1363,
  },
}

/** Ряды подписей. Сверху — общая высота для 2000 и 2400; снизу — два ряда под линией земли. */
const ROWS = {
  topLine: 44,
  topText: 30,
  bottomLine: 668, // «трапик 40 см» и «пол 2000 мм»
  bottomText: 702, // запас под телефон: там 14 px = 34 единицы
  names: 760, // «Баня-бочка» и «Подкова», одна базовая линия
}

const TONE_STROKE = { accent: 'stroke-accent', alert: 'stroke-alert-on-dark' }
const TONE_FILL = { accent: 'fill-accent', alert: 'fill-alert-on-dark', muted: 'fill-muted-on-dark' }

/** Наконечники размерных линий. Один маркер на цвет. */
function ArrowMarkers({ id }) {
  return (
    <defs>
      {['accent', 'alert'].map((tone) => (
        <marker
          key={tone}
          id={`${id}-${tone}`}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="12"
          markerHeight="12"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M0,1 L10,5 L0,9 Z" className={TONE_FILL[tone]} />
        </marker>
      ))}
    </defs>
  )
}

/** Размерная линия со стрелками на концах (1 px) или выносная (тоньше, полупрозрачная). */
function Thin({ x1, y1, x2, y2, tone = 'accent', arrows = false, markerId }) {
  const ref = arrows ? `url(#${markerId}-${tone})` : undefined
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={TONE_STROKE[tone]}
      strokeWidth={arrows ? 1 : 0.75}
      opacity={arrows ? 1 : 0.6}
      vectorEffect="non-scaling-stroke"
      markerStart={ref}
      markerEnd={ref}
    />
  )
}

/** Подпись 14 px (через --s). vertical — вдоль вертикальной размерной линии; size — другой размер в px. */
function Label({ x, y, tone = 'muted', vertical = false, size, children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      transform={vertical ? `rotate(-90 ${x} ${y})` : undefined}
      className={`dg-label ${TONE_FILL[tone]}`}
      style={size ? { fontSize: `calc(${size}px / var(--s, 1))` } : undefined}
    >
      {children}
    </text>
  )
}

/** Название бани: 18 px, жирное, светлое. */
function Name({ x, y, children }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className="fill-surface"
      style={{ fontSize: 'calc(18px / var(--s, 1))', fontWeight: 700 }}
    >
      {children}
    </text>
  )
}

function BarrelMarks({ id, mobile = false }) {
  const b = G.barrel
  return (
    <>
      {/* 2000 мм — наружный диаметр, сверху */}
      <Thin x1={b.left} y1={b.wideY - 3} x2={b.left} y2={ROWS.topLine - 6} />
      <Thin x1={b.right} y1={b.wideY - 3} x2={b.right} y2={ROWS.topLine - 6} />
      <Thin x1={b.left} y1={ROWS.topLine} x2={b.right} y2={ROWS.topLine} arrows markerId={id} />
      <Label x={b.cx} y={ROWS.topText}>
        2000 мм
      </Label>

      {/* Высота над головой — от верха трапика до внутреннего верха, слева от человека */}
      <Thin x1={b.trapikLeft} y1={b.trapikTop} x2={b.heightLineX - 6} y2={b.trapikTop} />
      <Thin x1={b.heightLineX} y1={b.trapikTop} x2={b.heightLineX} y2={b.innerTopAtLine} arrows markerId={id} />
      {/* На телефоне 12 px: при масштабе половины схемы 14 px не помещаются вдоль линии */}
      <Label x={b.heightLineX - 12} y={(b.trapikTop + b.innerTopAtLine) / 2} vertical size={mobile ? 12 : undefined}>
        высота над головой
      </Label>

      {/* Трапик 40 см — проблемное место, под линией земли */}
      <Thin x1={b.trapikLeft} y1={b.trapikBottom} x2={b.trapikLeft} y2={ROWS.bottomLine + 6} tone="alert" />
      <Thin x1={b.trapikRight} y1={b.trapikBottom} x2={b.trapikRight} y2={ROWS.bottomLine + 6} tone="alert" />
      <Thin x1={b.trapikLeft} y1={ROWS.bottomLine} x2={b.trapikRight} y2={ROWS.bottomLine} tone="alert" arrows markerId={id} />
      <Label x={b.cx} y={ROWS.bottomText} tone="alert">
        трапик 40 см
      </Label>

      <Name x={b.cx} y={ROWS.names}>
        Баня-бочка
      </Name>
    </>
  )
}

function HorseshoeMarks({ id }) {
  const h = G.horseshoe
  const dimX = h.right + 50 // вертикальная линия 2300 справа от Подковы
  return (
    <>
      {/* 2400 мм — наружная ширина в самом широком месте, сверху */}
      <Thin x1={h.left} y1={h.wideY - 3} x2={h.left} y2={ROWS.topLine - 6} />
      <Thin x1={h.right} y1={h.wideY - 3} x2={h.right} y2={ROWS.topLine - 6} />
      <Thin x1={h.left} y1={ROWS.topLine} x2={h.right} y2={ROWS.topLine} arrows markerId={id} />
      <Label x={h.cx} y={ROWS.topText}>
        2400 мм
      </Label>

      {/* 2300 мм — от верха пола до наружного верха свода, справа */}
      <Thin x1={h.cx + 16} y1={h.top} x2={dimX + 6} y2={h.top} />
      <Thin x1={h.outerRightAtFloor + 3} y1={h.floorTop} x2={dimX + 6} y2={h.floorTop} />
      <Thin x1={dimX} y1={h.floorTop} x2={dimX} y2={h.top} arrows markerId={id} />
      <Label x={dimX + 24} y={(h.floorTop + h.top) / 2} vertical>
        2300 мм
      </Label>

      {/* Пол 2000 мм — между внутренними гранями стен, под линией земли */}
      <Thin x1={h.innerLeft} y1={h.floorTop} x2={h.innerLeft} y2={ROWS.bottomLine + 6} />
      <Thin x1={h.innerRight} y1={h.floorTop} x2={h.innerRight} y2={ROWS.bottomLine + 6} />
      <Thin x1={h.innerLeft} y1={ROWS.bottomLine} x2={h.innerRight} y2={ROWS.bottomLine} arrows markerId={id} />
      <Label x={h.cx} y={ROWS.bottomText} tone="accent">
        пол 2000 мм
      </Label>

      <Name x={h.cx} y={ROWS.names}>
        Баня-Подкова
      </Name>
    </>
  )
}

/** Один SVG: картинка в общем viewBox и размеры поверх. view — окно [x, w] по картинке. */
function Scheme({ view, label, href, className = '', children }) {
  const ref = useRef(null)
  const id = useId().replace(/:/g, '')
  useUnitScale(ref, view.w)
  return (
    <svg
      ref={ref}
      viewBox={`${view.x} 0 ${view.w} ${IMG.h}`}
      role="img"
      aria-label={label}
      className={`block h-auto w-full ${className}`}
      shapeRendering="geometricPrecision"
    >
      <image href={href} x="0" y="0" width={IMG.w} height={IMG.h} />
      <ArrowMarkers id={id} />
      {children(id)}
    </svg>
  )
}

/** На телефоне: окна одинаковой ширины, чтобы масштаб и рост человека совпадали. */
const MOBILE_VIEW_W = 820
const VIEWS = {
  full: { x: 0, w: IMG.w },
  barrel: { x: 0, w: MOBILE_VIEW_W },
  horseshoe: { x: 705, w: MOBILE_VIEW_W },
}

export default function CrossSectionDiagram() {
  const wrapRef = useRef(null)
  // Картинка подгружается лениво: href ставится, когда схема подходит к экрану
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = wrapRef.current
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
  const href = near ? `${import.meta.env.BASE_URL}${IMG.src}` : undefined

  return (
    <div ref={wrapRef}>
      {/* От 600 px — вся схема 2:1 одним SVG */}
      <Scheme
        view={VIEWS.full}
        href={href}
        className="hidden min-[600px]:block"
        label="Сравнение в разрезе: в бане-бочке диаметром 2 метра человек почти упирается головой в потолок, в Подкове шириной 2,4 метра и высотой 2,3 метра над головой остаётся свободное место"
      >
        {(id) => (
          <>
            <BarrelMarks id={id} />
            <HorseshoeMarks id={id} />
          </>
        )}
      </Scheme>

      {/* До 600 px — та же картинка двумя половинами друг под другом, в одном масштабе */}
      <div className="flex flex-col gap-6 min-[600px]:hidden">
        <Scheme
          view={VIEWS.barrel}
          href={href}
          label="Баня-бочка в разрезе: диаметр 2 метра, человек стоит на трапике шириной 40 см и почти упирается головой в потолок"
        >
          {(id) => <BarrelMarks id={id} mobile />}
        </Scheme>
        <Scheme
          view={VIEWS.horseshoe}
          href={href}
          label="Подкова в разрезе: ширина 2,4 метра, высота 2,3 метра, пол 2 метра, над головой остаётся свободное место"
        >
          {(id) => <HorseshoeMarks id={id} />}
        </Scheme>
      </div>
    </div>
  )
}
