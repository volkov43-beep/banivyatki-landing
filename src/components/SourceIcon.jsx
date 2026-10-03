import { SOURCES } from '../data/reviews.js'

const BASE = import.meta.env.BASE_URL

/**
 * Иконка площадки (Авито, Яндекс Карты) из официальных файлов.
 * shape="round" — круглая, для карточек (файлы 56 / 80 / 112: берётся
 * наименьший не меньше двойной плотности показа — 18 → 56, 40 → 80);
 * shape="square" — квадратная со скруглением, для плашек рейтинга (файл 128).
 * Тень как у логотипа в шапке, но мягче.
 */
const FILES = { round: [56, 80, 112], square: [128] }

export default function SourceIcon({ source, size, shape = 'round', className = '' }) {
  const { icon, ratingIcon, name } = SOURCES[source]
  const file = shape === 'square' ? ratingIcon : icon
  const sizes = FILES[shape]
  const px = sizes.find((s) => s >= size * 2) ?? sizes[sizes.length - 1]
  return (
    <img
      src={`${BASE}photos/${file}-${px}.webp`}
      width={size}
      height={size}
      alt={name}
      decoding="async"
      className={`shrink-0 drop-shadow-[0_2px_8px_rgba(26,21,18,0.18)] ${shape === 'round' ? 'rounded-full' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
