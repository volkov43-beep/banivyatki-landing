import { useEffect, useRef, useState } from 'react'
import { photoSrc } from '../ResponsivePhoto.jsx'

const SWIPE_PX = 40

/**
 * Увеличение фото объекта поверх страницы: два кадра, стрелки влево-вправо,
 * закрытие по клику вне картинки, по кнопке «×» и по Esc; на телефоне
 * листается свайпом. Без таймеров и автопрокрутки.
 *
 * Диалог модальный: фокус уходит на кнопку закрытия, стрелки клавиатуры
 * листают, прокрутка страницы под ним выключена; при закрытии фокус
 * возвращается туда, откуда открыли.
 */
export default function Lightbox({ work, onClose }) {
  const [index, setIndex] = useState(0)
  const closeRef = useRef(null)
  const touchStart = useRef(null)
  const photos = work.photos
  const count = photos.length

  const go = (step) => setIndex((i) => (i + step + count) % count)

  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Остальные кадры подгружаем заранее, чтобы стрелка листала без паузы
  useEffect(() => {
    photos.slice(1).forEach((p) => {
      const img = new Image()
      img.src = photoSrc(p.name, 1280)
    })
  }, [photos])

  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (dx <= -SWIPE_PX) go(1)
    else if (dx >= SWIPE_PX) go(-1)
  }

  const photo = photos[index]
  const arrow = 'absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(26,21,18,0.7)] text-surface'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Фото: ${work.caption}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,21,18,0.92)] p-4 md:p-10"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-3 top-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(26,21,18,0.7)] text-[28px] leading-none text-surface md:right-6 md:top-6"
      >
        ×
      </button>

      {/* Картинка: клик по ней не закрывает, свайп листает */}
      <figure
        className="relative m-0 max-h-full max-w-[1280px]"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={photo.name}
          src={photoSrc(photo.name, 1280)}
          srcSet={`${photoSrc(photo.name, 640)} 640w, ${photoSrc(photo.name, 1280)} 1280w`}
          sizes="(min-width: 1024px) 1200px, 100vw"
          alt={photo.alt}
          width={1280}
          height={960}
          decoding="async"
          className="block h-auto max-h-[calc(100vh-112px)] w-auto max-w-full rounded-md object-contain"
        />
        <figcaption className="mt-3 flex items-center justify-between gap-4 text-[15px] text-surface">
          <span>{work.caption}</span>
          <span className="shrink-0 text-muted-on-dark">
            {index + 1} / {count}
          </span>
        </figcaption>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Предыдущее фото" className={`${arrow} left-2 md:-left-16`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12.5 4 6.5 10l6 6" />
              </svg>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Следующее фото" className={`${arrow} right-2 md:-right-16`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="m7.5 4 6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </figure>
    </div>
  )
}
