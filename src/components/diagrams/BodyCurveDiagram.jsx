import MicroDiagram, { contour, Thin, Label } from './MicroDiagram.jsx'

/**
 * «Дуга стен по форме тела».
 * Сидящий человек в профиль: спина повторяет дугу стены. Силуэт обрезается
 * по внутренней стороне стены, поэтому линия спины и линия стены совпадают.
 */
const WALL = 'M40,140 C31,118 25,80 25,38 A115,115 0 0 1 31.5,0'

export default function BodyCurveDiagram() {
  return (
    <MicroDiagram
      title="Спина по дуге стены"
      desc="Человек сидит на полке, откинувшись на стену. Линия спины совпадает с дугой стены."
    >
      {(id) => (
        <>
          <defs>
            <clipPath id={`${id}-inside`}>
              <path d={`${WALL} H240 V140 H40 Z`} />
            </clipPath>
          </defs>

          {/* Силуэт: заведён за стену и обрезан по ней */}
          <g className="fill-muted-on-dark" clipPath={`url(#${id}-inside)`} aria-hidden="true">
            <circle cx="40" cy="22" r="12" />
            <rect x="35" y="32" width="9" height="12" />
            <path d="M10,44 H49 L54,95 H10 Z" />
            <path d="M10,83 H97 V95 H10 Z" />
            <path d="M85,95 H97 V140 H85 Z" />
            <path d="M85,134 H112 V140 H85 Z" />
          </g>

          {/* Полок и пол */}
          <rect x="28" y="95" width="82" height="4" {...contour} />
          <path d="M104,99 V140" {...contour} />
          <path d="M14,140 H226" {...contour} />
          {/* Стена — поверх силуэта */}
          <path d={WALL} {...contour} />

          {/* Выноска на линию контакта */}
          <circle cx="27" cy="62" r="2.5" className="fill-accent" />
          <Thin x1="30" y1="62" x2="90" y2="30" markerId={id} />
          <Thin x1="90" y1="30" x2="98" y2="30" markerId={id} />
          <Label x="236" y="34" anchor="end">
            спина по дуге стены
          </Label>
        </>
      )}
    </MicroDiagram>
  )
}
