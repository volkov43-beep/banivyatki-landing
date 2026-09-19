/**
 * Место под фотографию 4:3 на всю ширину блока.
 *
 * src — путь относительно public/, например "photos/drain-floor.webp".
 * Пока src пустой, рисуется рамка контуром muted-on-dark с текстом «фото».
 * width и height задают пропорцию до загрузки, чтобы вёрстка не прыгала.
 */
export default function PhotoSlot({ src = '', alt = '', caption, width = 800, height = 600 }) {
  const resolved = src ? `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}` : ''

  return (
    <figure className="m-0">
      {resolved ? (
        <img
          src={resolved}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className="block aspect-[4/3] h-auto w-full object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt || 'Место под фотографию'}
          className="flex aspect-[4/3] w-full items-center justify-center border border-muted-on-dark text-label text-muted-on-dark"
        >
          фото
        </div>
      )}
      {caption && <figcaption className="mt-2 text-label text-muted-on-dark">{caption}</figcaption>}
    </figure>
  )
}
