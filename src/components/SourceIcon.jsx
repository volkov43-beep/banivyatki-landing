import { SOURCES } from '../data/reviews.js'

const BASE = import.meta.env.BASE_URL

/**
 * Круглая иконка площадки (Авито, Яндекс Карты). Файлы в public/photos/
 * лежат в двойной плотности: показываем 56 → берём 112, показываем 28 → 56.
 * Тень как у логотипа в шапке, но мягче — фон светлый.
 */
export default function SourceIcon({ source, size }) {
  const { icon, name } = SOURCES[source]
  return (
    <img
      src={`${BASE}photos/${icon}-${size * 2}.webp`}
      width={size}
      height={size}
      alt={name}
      decoding="async"
      className="shrink-0 rounded-full drop-shadow-[0_2px_8px_rgba(26,21,18,0.18)]"
      style={{ width: size, height: size }}
    />
  )
}
