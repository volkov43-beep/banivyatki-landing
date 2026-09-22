const STAR = 20 // размер звезды, px
const GAP = 3 // промежуток между звёздами, px
const COUNT = 5

/** Пятиконечная звезда в квадрате 20×20 (вершина сверху). */
const STAR_PATH =
  'M10 1.2 12.55 6.9 18.8 7.55 14.1 11.75 15.45 17.9 10 14.75 4.55 17.9 5.9 11.75 1.2 7.55 7.45 6.9Z'

/**
 * Звёзды рейтинга инлайн-SVG. Заполнение считается из числа: 4,5 → четыре
 * полных и половина пятой (левая половина accent, правая пустая).
 * Пустая звезда — muted с непрозрачностью 35 %.
 * `rating` — строка как на площадке («4,5») или число.
 */
export default function RatingStars({ rating, id }) {
  const value = typeof rating === 'number' ? rating : parseFloat(String(rating).replace(',', '.'))
  const label = `Рейтинг ${String(rating).replace('.', ',')} из 5`
  const width = COUNT * STAR + (COUNT - 1) * GAP

  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={STAR}
      viewBox={`0 0 ${width} ${STAR}`}
      className="shrink-0"
    >
      {Array.from({ length: COUNT }, (_, i) => {
        const fill = Math.min(Math.max(value - i, 0), 1) // доля заполнения этой звезды
        const x = i * (STAR + GAP)
        const clipId = `${id}-star-${i}`
        return (
          <g key={i} transform={`translate(${x} 0)`}>
            <path d={STAR_PATH} fill="var(--color-muted)" fillOpacity="0.35" />
            {fill > 0 && (
              <>
                {fill < 1 && (
                  <clipPath id={clipId}>
                    <rect x="0" y="0" width={STAR * fill} height={STAR} />
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
