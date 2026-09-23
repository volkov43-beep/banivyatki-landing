const BASE = import.meta.env.BASE_URL

/**
 * Фото в двух ширинах (блоки «Посмотрите баню до покупки» и «Наши работы»):
 * файлы `<name>-1280.webp` и `<name>-640.webp` (4:3, WebP), браузер выбирает
 * по `sizes`. Ленивая загрузка (loading можно переопределить), явные
 * width/height, скругление 6 px.
 */
export function photoSrc(name, width) {
  return `${BASE}photos/${name}-${width}.webp`
}

export default function ResponsivePhoto({ name, alt, sizes = '100vw', className = '', loading = 'lazy' }) {
  const src = (w) => photoSrc(name, w)
  return (
    <img
      src={src(1280)}
      srcSet={`${src(640)} 640w, ${src(1280)} 1280w`}
      sizes={sizes}
      alt={alt}
      width={1280}
      height={960}
      loading={loading}
      decoding="async"
      className={`block h-auto w-full rounded-md object-cover ${className}`}
      style={{ aspectRatio: '4 / 3' }}
    />
  )
}
