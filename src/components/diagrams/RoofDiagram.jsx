import Diagram, { useContour, Thin, Dot, Label } from './Diagram.jsx'

/**
 * Кровельный пирог: обрешётка, подкладочный ковёр, мягкая черепица.
 * Слои нарисованы с уклоном; подписи выносками.
 */
const ANGLE = -12
const CX = 240
const CY = 140

/** Точка на уклоне: координаты внутри повёрнутой группы -> координаты схемы. */
function rot(x, y) {
  const a = (ANGLE * Math.PI) / 180
  const dx = x - CX
  const dy = y - CY
  return [CX + dx * Math.cos(a) - dy * Math.sin(a), CY + dx * Math.sin(a) + dy * Math.cos(a)]
}

const BATTENS = [60, 120, 180, 240, 300, 360]

function Body() {
  const contour = useContour()
  const thin = useContour(1)
  const [sx, sy] = rot(130, 126)
  const [ux, uy] = rot(330, 147)
  const [bx, by] = rot(200, 158)
  return (
    <>
      <g transform={`rotate(${ANGLE} ${CX} ${CY})`}>
        {/* Обрешётка: доски в сечении с промежутками */}
        {BATTENS.map((x) => (
          <path key={x} d={`M${x},150 H${x + 40} V162 H${x} Z`} {...contour} />
        ))}
        {/* Подкладочный ковёр: тонкий слой */}
        <path d="M60,144 H400 V150 H60 Z" {...thin} />
        {/* Мягкая черепица: полотно с лепестками */}
        <path d="M60,124 H400 V144 H60 Z" {...contour} />
        <path d="M60,134 H400" {...thin} />
        {[80, 120, 160, 200, 240, 280, 320, 360].map((x) => (
          <path key={x} d={`M${x},124 V134 M${x + 20},134 V144`} {...thin} />
        ))}
      </g>

      {/* Выноски */}
      <Dot x={sx} y={sy} />
      <Thin x1={sx} y1={sy - 3} x2="190" y2="60" />
      <Thin x1="190" y1="60" x2="196" y2="60" />
      <Label x="200" y="64" anchor="start">
        мягкая черепица
      </Label>

      <Dot x={ux} y={uy} />
      <Thin x1={ux} y1={uy + 3} x2="420" y2="188" />
      <Label x="466" y="206" anchor="end">
        подкладочный ковёр
      </Label>
      <Label x="466" y="222" anchor="end">
        в верхней комплектации
      </Label>

      <Dot x={bx} y={by} />
      <Thin x1={bx} y1={by + 3} x2="152" y2="210" />
      <Thin x1="152" y1="210" x2="146" y2="210" />
      <Label x="142" y="214" anchor="end">
        обрешётка
      </Label>
    </>
  )
}

export default function RoofDiagram() {
  return (
    <Diagram
      width={480}
      height={240}
      scale
      scheme="light"
      title="Кровельный пирог"
      desc="Слои кровли снизу вверх: обрешётка, подкладочный ковёр, мягкая черепица. Подкладочный ковёр — в верхней комплектации."
    >
      <Body />
    </Diagram>
  )
}
