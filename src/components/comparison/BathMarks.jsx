/**
 * Визуальная пара «чужое / наше» блока сравнения: бочка — alert-on-dark
 * и круг, Подкова — podkova и арка. Используется только в этом блоке.
 *
 * Иконки по правилам иконок: только линии 1,5 px (толщина держится на любом
 * размере через non-scaling-stroke), скруглённые концы и стыки, без заливок,
 * цвет currentColor, aria-hidden — смысл несёт слово рядом.
 * Размеры: 18 в начале зоны карточки, 16 в легенде, 14 в метках под картинками.
 */
const KINDS = {
  barrel: {
    color: 'text-alert-on-dark',
    shape: <circle cx="9" cy="9" r="6.75" vectorEffect="non-scaling-stroke" />,
  },
  podkova: {
    color: 'text-podkova',
    // Арка: две вертикали, сверху полукруг
    shape: <path d="M2.75 15.75V8.5a6.25 6.25 0 0 1 12.5 0v7.25" vectorEffect="non-scaling-stroke" />,
  },
}

export function BathIcon({ kind, size = 18, className = '' }) {
  return (
    <svg
      viewBox="0 0 18 18"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${KINDS[kind].color} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {KINDS[kind].shape}
    </svg>
  )
}

/** Легенда под большой схемой: в строку от 600 px, ниже — в две строки. */
export function BathLegend({ className = '' }) {
  return (
    <ul
      className={`flex list-none flex-col items-center gap-2 p-0 text-[13px] leading-[1.3] text-muted-on-dark min-[600px]:flex-row min-[600px]:justify-center min-[600px]:gap-8 ${className}`}
    >
      <li className="flex items-center gap-2">
        <BathIcon kind="barrel" size={16} />
        обычная баня-бочка
      </li>
      <li className="flex items-center gap-2">
        <BathIcon kind="podkova" size={16} />
        Подкова
      </li>
    </ul>
  )
}

const STRIPS = {
  barrel: {
    title: 'Баня-бочка',
    box: 'border-alert-on-dark bg-[rgba(217,102,58,0.08)]',
    head: 'text-alert-on-dark',
    text: 'text-muted-on-dark',
  },
  podkova: {
    title: 'Подкова',
    box: 'border-podkova bg-[rgba(127,176,105,0.10)]',
    head: 'text-podkova',
    text: 'text-surface',
  },
}

/**
 * Зона карточки: всё, что относится к одной бане, на общей подложке с линией
 * 3 px слева (фон rgba и линия цвета бани, скругление 4 px). В начале —
 * единственная метка зоны (иконка 18 px + название, 12 px 700 капсом), дальше
 * текст, схемы, фото, подписи и сноски во всю ширину зоны.
 */
export function Zone({ kind, children }) {
  const s = STRIPS[kind]
  return (
    <div className={`rounded-[4px] border-l-[3px] px-4 py-[14px] ${s.box}`}>
      <p className={`flex items-center gap-2 text-[12px] font-bold uppercase leading-[18px] tracking-[0.06em] ${s.head}`}>
        <BathIcon kind={kind} size={18} />
        {s.title}
      </p>
      <div className="mt-1.5 [&>*+*]:mt-5">{children}</div>
    </div>
  )
}

/** Текст зоны: абзацы 14 px, у Подковы surface, у бочки muted-on-dark. */
export function ZoneText({ kind, children }) {
  const paragraphs = Array.isArray(children) ? children : [children]
  return (
    <div className="[&>p+p]:mt-2">
      {paragraphs.map((text) => (
        <p key={text} className={`text-[14px] leading-[1.45] ${STRIPS[kind].text}`}>
          {text}
        </p>
      ))}
    </div>
  )
}

/** Картинка внутри зоны и метка по центру под ней (под подписью к фото). */
export function ZoneFigure({ kind = 'podkova', children }) {
  return (
    <div>
      {children}
      <div className="mt-2.5 flex justify-center">
        <BathMark kind={kind} />
      </div>
    </div>
  )
}

/** Метка-чип одной из бань: иконка 14 px и название, 12 px 700 капсом. */
export function BathMark({ kind, className = '', style }) {
  return (
    <span
      style={style}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-bold uppercase leading-none tracking-[0.05em] ${STRIPS[kind].head} ${className}`}
    >
      <BathIcon kind={kind} size={14} />
      {STRIPS[kind].title}
    </span>
  )
}

/**
 * Метка поверх чертежа (например, над лупой): x — центр, y — нижний край
 * метки, в долях ширины и высоты картинки (по пикселям файла). Только от
 * 600 px: ниже на чертеже номера вместо подписей, а под чертежом уже стоят
 * метки «Баня-бочка» и «Подкова».
 */
export function BathMarkAt({ kind = 'podkova', x, y }) {
  return (
    <div className="hidden min-[600px]:block">
      <BathMark
        kind={kind}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
        style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      />
    </div>
  )
}

/**
 * Строка меток под чертежом с обеими банями: каждая метка по центру своей
 * половины. centers — центры бань в долях ширины картинки (по пикселям файла).
 */
export function BathMarksRow({ centers }) {
  return (
    <div className="relative mt-2 h-[14px]">
      {['barrel', 'podkova'].map((kind) => (
        <BathMark
          key={kind}
          kind={kind}
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${centers[kind] * 100}%` }}
        />
      ))}
    </div>
  )
}
