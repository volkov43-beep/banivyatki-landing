/**
 * Место под фотографию на всю ширину блока.
 *
 * src — путь относительно public/, например "photos/pech.webp".
 * Пока src пустой, рисуется полоса высотой 120 px с тонкой рамкой и текстом «фото».
 * width и height задают пропорцию до загрузки, чтобы вёрстка не прыгала;
 * aspect — CSS-пропорция кадра на странице (по умолчанию 4/3), лишнее обрезается.
 * scheme — 'dark' на фоне ink, 'light' на фоне surface.
 */
export default function PhotoSlot({
  src = '',
  alt = '',
  caption,
  width = 800,
  height = 600,
  aspect = '4 / 3',
  objectPosition = 'center',
  scheme = 'dark',
}) {
  const resolved = src ? `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}` : ''
  const muted = scheme === 'light' ? 'text-muted' : 'text-muted-on-dark'
  const border = scheme === 'light' ? 'border-muted' : 'border-muted-on-dark'

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
          className="block h-auto w-full object-cover"
          style={{ aspectRatio: aspect, objectPosition }}
        />
      ) : (
        <div
          role="img"
          aria-label={alt || 'Место под фотографию'}
          className={`flex h-[120px] w-full items-center justify-center border ${border} text-label ${muted}`}
        >
          фото
        </div>
      )}
      {caption && <figcaption className={`mt-2 text-label ${muted}`}>{caption}</figcaption>}
    </figure>
  )
}
