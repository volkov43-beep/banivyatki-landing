const UNIT = 20 // звезда нарисована в квадрате 20 × 20, масштабируется под size
const COUNT = 5

/** Пятиконечная звезда в квадрате 20×20 (вершина сверху). */
const STAR_PATH =
  'M10 1.2 12.55 6.9 18.8 7.55 14.1 11.75 15.45 17.9 10 14.75 4.55 17.9 5.9 11.75 1.2 7.55 7.45 6.9Z'

/**
 * Звёзды рейтинга инлайн-SVG. Заполнение считается из числа: 4,5 → четыре
 * полных и половина пятой (левая половина accent, правая пустая).
 * Пустая звезда — muted с непрозрачностью 35 %.
 * `rating` — строка как на площадке («4,5») или число.
 *
 * `size` — размер звезды в px (по умолчанию 20; в карточках отзывов 16),
 * промежуток между звёздами — 15 % размера.
 * `outline` — вариант для тёмного фона (плашка на первом экране) по правилам
 * иконок: контур accent 1,5 px со скруглёнными стыками у каждой звезды,
 * пустая звезда без заливки, заполненная доля — заливка accent.
 */
export default function RatingStars({ rating, id, outline = false, size = 20 }) {
  const value = typeof rating === 'number' ? rating : parseFloat(String(rating).replace(',', '.'))
  const label = `Рейтинг ${String(rating).replace('.', ',')} из 5`
  const gap = Math.round(size * 0.15)
  const width = COUNT * size + (COUNT - 1) * gap
  const k = size / UNIT

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={size}
      viewBox={`0 0 ${width} ${size}`}
      className="shrink-0"
    >
      {Array.from({ length: COUNT }, (_, i) => {
        const fill = Math.min(Math.max(value - i, 0), 1) // доля заполнения этой звезды
        const x = i * (size + gap)
        const clipId = `${id}-star-${i}`
        return (
          <g key={i} transform={`translate(${x} 0) scale(${k})`}>
            {outline ? (
              <path
                d={STAR_PATH}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            ) : (
              <path d={STAR_PATH} fill="var(--color-muted)" fillOpacity="0.35" />
            )}
            {fill > 0 && (
              <>
                {fill < 1 && (
                  <clipPath id={clipId}>
                    <rect x="0" y="0" width={UNIT * fill} height={UNIT} />
                  </clipPath>
                )}
                <path d={STAR_PATH} fill="var(--color-accent)" clipPath={fill < 1 ? `url(#${clipId})` : undefined} />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
