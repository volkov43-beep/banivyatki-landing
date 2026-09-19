import Diagram, { useContour, Thin, Dot, Label } from './Diagram.jsx'

/**
 * Вентиляция «живая баня»: сечение бани сбоку.
 * Приточка с шибером под печью, воздух поднимается через парную,
 * уходит через вытяжку с вентилятором; на стене форточка.
 */
function Body() {
  const contour = useContour()
  const thin = useContour(1)
  return (
    <>
      {/* Корпус бани сбоку: пол, стены, потолок */}
      <path d="M60,40 H420 V270 H60 Z" {...contour} />
      {/* Проём приточки в левой стене под печью */}
      <path d="M60,232 V258" className="stroke-surface" strokeWidth="4" fill="none" vectorEffect="non-scaling-stroke" />
      {/* Шибер: заслонка в проёме, приоткрыта */}
      <path d="M54,236 L74,254" {...contour} />
      <circle cx="54" cy="236" r="2" {...thin} />

      {/* Печь: топка, каменка, труба */}
      <path d="M92,180 H152 V270 H92 Z" {...contour} />
      <path d="M118,214 H140 V240 H118 Z" {...thin} />
      <path d="M100,180 V118 H144 V180" {...contour} />
      <path d="M100,140 H144 M100,160 H144" {...thin} />
      <path d="M108,126 l8,8 M120,122 l10,10 M134,128 l-8,6 M112,148 l10,6 M130,146 l-6,10 M110,166 l12,6 M128,168 l8,-6" {...thin} />
      <path d="M118,118 V40 M126,118 V40" {...contour} />

      {/* Вытяжка с вентилятором в правой стене вверху */}
      <path d="M420,66 V94" className="stroke-surface" strokeWidth="4" fill="none" vectorEffect="non-scaling-stroke" />
      <path d="M406,64 H434 V96 H406 Z" {...contour} />
      <circle cx="420" cy="80" r="9" {...thin} />
      <path d="M420,71 V89 M411,80 H429" {...thin} />

      {/* Форточка в правой стене */}
      <path d="M414,150 H426 V200 H414 Z" {...contour} />
      <path d="M414,200 L436,168" {...contour} />

      {/* Движение воздуха */}
      <Thin x1="14" y1="245" x2="84" y2="245" arrows="end" />
      <Thin x1="168" y1="256" x2="168" y2="150" arrows="end" />
      <Thin x1="196" y1="132" x2="392" y2="84" arrows="end" />
      <Thin x1="440" y1="80" x2="472" y2="80" arrows="end" />

      {/* Выноски */}
      <Dot x={64} y={245} />
      <Thin x1="66" y1="247" x2="92" y2="292" />
      <Thin x1="92" y1="292" x2="100" y2="292" />
      <Label x="104" y="296" anchor="start">
        приточка с шибером
      </Label>

      <Dot x={420} y={64} />
      <Thin x1="420" y1="62" x2="400" y2="30" />
      <Thin x1="400" y1="30" x2="392" y2="30" />
      <Label x="388" y="34" anchor="end">
        вентилятор 220 В
      </Label>

      <Dot x={426} y={190} />
      <Thin x1="428" y1="192" x2="446" y2="222" />
      <Thin x1="446" y1="222" x2="454" y2="222" />
      <Label x="474" y="240" anchor="end">
        форточка
      </Label>
    </>
  )
}

export default function VentilationDiagram() {
  return (
    <Diagram
      width={480}
      height={320}
      scale
      scheme="light"
      title="Схема вентиляции бани"
      desc="Сечение бани сбоку. Под печью приточное отверстие с шибером, воздух поднимается через парную и уходит через вытяжку с вентилятором 220 В в верхней части стены. На стене форточка."
    >
      <Body />
    </Diagram>
  )
}
