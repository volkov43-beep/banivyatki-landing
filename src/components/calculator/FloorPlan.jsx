import Diagram, { useContour, Label } from '../diagrams/Diagram.jsx'

/**
 * Планировка сверху в чертёжной манере. Все три схемы в одном масштабе:
 * viewBox рассчитан на 6 м, поэтому в одинаковых карточках длина
 * прямоугольника пропорциональна длине бани.
 * Только названия помещений, без метражей.
 */
const SCALE = 40 // 1 м = 40 единиц
const PAD = 6
const BODY_H = 2.4 * SCALE
const VIEW_W = 6 * SCALE + PAD * 2
const VIEW_H = BODY_H + PAD * 2

function Body({ layout, insulated }) {
  const contour = useContour(2)
  const thin = useContour(1)
  const accent = { fill: 'none', strokeWidth: 2, className: 'stroke-accent', vectorEffect: 'non-scaling-stroke' }
  const len = layout.length * SCALE
  let x = PAD
  const rooms = layout.rooms.map((room) => {
    const w = room.share * len
    const r = { ...room, x, w }
    x += w
    return r
  })
  return (
    <>
      <rect x={PAD} y={PAD} width={len} height={BODY_H} {...contour} />
      {rooms.slice(1).map((room) => (
        <line key={room.name} x1={room.x} y1={PAD} x2={room.x} y2={PAD + BODY_H} {...thin} />
      ))}
      {rooms.map((room) => {
        const cx = room.x + room.w / 2
        const cy = PAD + BODY_H / 2
        const highlight = insulated && room.sauna
        return (
          <g key={room.name}>
            {highlight && <rect x={room.x + 3} y={PAD + 3} width={room.w - 6} height={BODY_H - 6} {...accent} />}
            <Label x={cx} y={highlight ? cy - 2 : cy + 4} size={12}>
              {room.name}
            </Label>
            {highlight && (
              <Label x={cx} y={cy + 14} size={12} tone="accent">
                утеплена
              </Label>
            )}
          </g>
        )
      })}
    </>
  )
}

export default function FloorPlan({ layout, insulated = false }) {
  const names = layout.rooms.map((r) => r.name).join(', ')
  return (
    <Diagram
      width={VIEW_W}
      height={VIEW_H}
      scale
      scheme="light"
      title={`Планировка бани ${layout.length} м`}
      desc={`Вид сверху, слева направо: ${names}.${insulated ? ' Парная утеплена.' : ''}`}
    >
      <Body layout={layout} insulated={insulated} />
    </Diagram>
  )
}
