import MicroDiagram, { contour, Thin, Label } from './MicroDiagram.jsx'

/**
 * «Без стяжек, на обвязке».
 * Слева — узел в разрезе: обвязочный брус, в паз которого входит стена-дуга.
 * Справа для контраста — фрагмент стенки бочки со стяжным кольцом.
 */
export default function FrameJointDiagram() {
  return (
    <MicroDiagram
      title="Узел обвязки подковы и стяжка бочки"
      desc="Слева стена-дуга входит в паз обвязочного бруса. Справа стяжное кольцо на стенке бочки, которое нужно подтягивать."
    >
      {(id) => (
        <>
          {/* Обвязочный брус в сечении */}
          <rect x="18" y="104" width="94" height="30" {...contour} />
          {/* Стена-дуга: две параллельные линии, уходящие в паз бруса */}
          <path d="M60,6 C46,38 40,70 40,118" {...contour} />
          <path d="M67,6 C53,38 47,70 47,118" {...contour} />
          <path d="M40,118 H47" {...contour} />
          {/* Выноска на соединение */}
          <circle cx="43.5" cy="111" r="2.5" className="fill-accent" />
          <Thin x1="46" y1="111" x2="86" y2="90" markerId={id} />
          <Thin x1="86" y1="90" x2="104" y2="90" markerId={id} />
          <Label x="65" y="148">
            обвязка
          </Label>

          {/* Фрагмент стенки бочки со стяжным кольцом */}
          <path d="M176,8 A78,78 0 0 1 176,112" {...contour} />
          <path d="M170,12 A72,72 0 0 1 170,108" {...contour} />
          {/* Кольцо: полоса снаружи стенки и натяжной узел */}
          <path d="M178,4 A84,84 0 0 1 178,116" {...contour} strokeWidth="3" />
          <rect x="192" y="50" width="10" height="20" {...contour} />
          <path d="M202,60 H212" {...contour} />
          <Label x="200" y="134" tone="alert">
            нужно
          </Label>
          <Label x="200" y="148" tone="alert">
            подтягивать
          </Label>
        </>
      )}
    </MicroDiagram>
  )
}
