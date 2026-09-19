import MicroDiagram, { contour, hairline, Thin, Label } from './MicroDiagram.jsx'

/**
 * «Двойной проливной пол».
 * Сечение: верхний настил с зазорами, под ним воздух, ниже утеплённый пол
 * с уклоном к сливу. Стрелки показывают, куда уходит вода.
 */
const BOARDS = [18, 56, 94, 132, 170]
const GAPS = [54, 92, 130, 168]

/** y верхней плоскости нижнего пола в точке x (уклон вправо, к сливу). */
const slopeY = (x) => 78 + ((x - 18) * 10) / 178

export default function DrainFloorDiagram() {
  return (
    <MicroDiagram
      title="Сечение двойного проливного пола"
      desc="Верхний настил из досок с зазорами 4–5 мм, под ним воздушный промежуток, ниже утеплённый пол с уклоном к сливу. Вода проходит сквозь зазоры и стекает в слив."
    >
      {(id) => (
        <>
          {/* Верхний настил */}
          {BOARDS.map((x) => (
            <rect key={x} x={x} y="40" width="34" height="8" {...contour} />
          ))}
          {/* Лаги настила */}
          <rect x="26" y="48" width="8" height="10" {...contour} />
          <rect x="178" y="48" width="8" height="10" {...contour} />

          {/* Зазор 4–5 мм: выносные линии и стрелки снаружи */}
          <Thin x1="52" y1="36" x2="52" y2="14" />
          <Thin x1="56" y1="36" x2="56" y2="14" />
          <Thin x1="34" y1="18" x2="52" y2="18" arrows="end" markerId={id} />
          <Thin x1="74" y1="18" x2="56" y2="18" arrows="end" markerId={id} />
          <Label x="80" y="23" anchor="start">
            4–5 мм
          </Label>

          {/* Нижний утеплённый пол с уклоном */}
          <path d={`M18,${slopeY(18)} L196,${slopeY(196)} V108 H18 Z`} {...contour} />
          {[40, 70, 100, 130, 160].map((x) => (
            <line key={x} x1={x} y1={slopeY(x) + 4} x2={x + 14} y2={slopeY(x + 14) + 14} {...hairline} />
          ))}
          {/* Слив: воронка и труба */}
          <path d={`M196,${slopeY(196)} H214 L209,100 H201 Z`} {...contour} />
          <path d="M201,100 V132 M209,100 V132" {...contour} />
          <Label x="205" y="148">
            слив
          </Label>

          {/* Вода: сквозь зазоры вниз, по уклону к сливу, в трубу */}
          {GAPS.map((x) => (
            <Thin key={x} x1={x} y1="52" x2={x} y2={slopeY(x) - 4} arrows="end" markerId={id} />
          ))}
          <Thin x1="60" y1={slopeY(60) - 4} x2="190" y2={slopeY(190) - 4} arrows="end" markerId={id} />
          <Thin x1="205" y1="104" x2="205" y2="126" arrows="end" markerId={id} />
        </>
      )}
    </MicroDiagram>
  )
}
