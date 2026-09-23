const BASE = import.meta.env.BASE_URL

/**
 * Фото в двух ширинах (блоки «Посмотрите баню до покупки», «Наши работы»,
 * «Что внутри»): файлы `<name>-1280.webp` и `<name>-640.webp` (WebP), браузер
 * выбирает по `sizes`. ratio — '4/3' (по умолчанию) или '3/4' для вертикальных
 * кадров; widths — доступные ширины (по умолчанию [640, 1280]; если исходник
 * мал, только [640]). Ленивая загрузка (loading можно переопределить), явные
 * width/height, скругление 6 px.
 */
export function photoSrc(name, width) {
  return `${BASE}photos/${name}-${width}.webp`
}

export default function ResponsivePhoto({ name, alt, sizes = '100vw', className = '', loading = 'lazy', ratio = '4/3', widths = [640, 1280] }) {
  const src = (w) => photoSrc(name, w)
  const [rw, rh] = ratio.split('/').map(Number)
  const largest = Math.max(...widths)
  return (
    <img
      src={src(largest)}
      srcSet={widths.map((w) => `${src(w)} ${w}w`).join(', ')}
      sizes={sizes}
      alt={alt}
      width={largest}
      height={Math.round((largest * rh) / rw)}
      loading={loading}
      decoding="async"
      className={`block h-auto w-full rounded-md object-cover ${className}`}
      style={{ aspectRatio: `${rw} / ${rh}` }}
    />
  )
}
