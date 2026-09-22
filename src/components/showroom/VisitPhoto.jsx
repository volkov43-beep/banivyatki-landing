const BASE = import.meta.env.BASE_URL

/**
 * Фото блока «Посмотрите баню до покупки»: два файла на одно фото,
 * `<name>-1280.webp` и `<name>-640.webp` (4:3, WebP), браузер выбирает по
 * `sizes`. Ленивая загрузка, явные width/height, скругление 6 px.
 */
export default function VisitPhoto({ name, alt, sizes = '100vw', className = '' }) {
  const src = (w) => `${BASE}photos/${name}-${w}.webp`
  return (
    <img
      src={src(1280)}
      srcSet={`${src(640)} 640w, ${src(1280)} 1280w`}
      sizes={sizes}
      alt={alt}
      width={1280}
      height={960}
      loading="lazy"
      decoding="async"
      className={`block h-auto w-full rounded-md object-cover ${className}`}
      style={{ aspectRatio: '4 / 3' }}
    />
  )
}
