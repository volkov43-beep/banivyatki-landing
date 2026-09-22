import { SOURCES } from '../data/reviews.js'

const BASE = import.meta.env.BASE_URL

/**
 * Иконка площадки (Авито, Яндекс Карты) из официальных файлов.
 * shape="round" — круглая, для карточек (показ 40 → файл 80, 28 → 56, 56 → 112);
 * shape="square" — квадратная со скруглением, для плашек рейтинга (показ 64 → файл 128).
 * Файлы в public/photos/ лежат в двойной плотности. Тень как у логотипа в шапке, но мягче.
 */
export default function SourceIcon({ source, size, shape = 'round', className = '' }) {
  const { icon, ratingIcon, name } = SOURCES[source]
  const file = shape === 'square' ? ratingIcon : icon
  return (
    <img
      src={`${BASE}photos/${file}-${size * 2}.webp`}
      width={size}
      height={size}
      alt={name}
      decoding="async"
      className={`shrink-0 drop-shadow-[0_2px_8px_rgba(26,21,18,0.18)] ${shape === 'round' ? 'rounded-full' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
