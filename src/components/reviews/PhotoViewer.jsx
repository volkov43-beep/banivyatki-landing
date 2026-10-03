import { useEffect, useRef, useState } from 'react'

const BASE = import.meta.env.BASE_URL
const SWIPE_PX = 40

export function reviewPhotoSrc(name, size) {
  return `${BASE}photos/${name}-${size}.webp`
}

/**
 * Просмотр фото отзыва поверх страницы: затемнение rgba(26,21,18,0.85),
 * кадр по центру не больше 90 % высоты и ширины экрана, целиком (вертикальные
 * не обрезаются). Несколько фото — стрелки влево-вправо и точки снизу,
 * на телефоне свайп. Закрытие: крестик, Esc, клик по затемнению.
 * Клавиатура: стрелки листают, Tab ходит только внутри окна. При открытии
 * фокус на крестике, при закрытии возвращается на миниатюру, с которой
 * открыли. Прокрутка страницы под окном выключена. Подпись под кадром —
 * имя автора и площадка. Без библиотек.
 */
export default function PhotoViewer({ review, sourceName, start = 0, onClose }) {
  const [index, setIndex] = useState(start)
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const touchStart = useRef(null)
  const photos = review.photos
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
      else if (e.key === 'Tab') {
        // Фокус не выходит из окна: по кругу между его кнопками
        const focusable = dialogRef.current?.querySelectorAll('button')
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
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
    photos.forEach((p, i) => {
      if (i === start) return
      const img = new Image()
      img.src = reviewPhotoSrc(p.name, 'full')
    })
  }, [photos, start])

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
  const arrow =
    'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(26,21,18,0.7)] text-surface'

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Фото из отзыва: ${review.author}, ${sourceName}`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,21,18,0.85)]"
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(26,21,18,0.7)] text-[26px] leading-none text-surface md:right-6 md:top-6"
      >
        ×
      </button>

      {/* Кадр: клик по нему не закрывает, свайп листает. Не больше 90 % экрана. */}
      <figure
        className="relative m-0 flex max-h-[90vh] max-w-[90vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={photo.name}
          src={reviewPhotoSrc(photo.name, 'full')}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          decoding="async"
          className="block h-auto max-h-[calc(90vh-56px)] w-auto max-w-[90vw] rounded-md object-contain"
        />
        <figcaption className="mt-3 flex h-5 items-center gap-2 text-[14px] leading-none text-surface">
          <span>
            {review.author} · {sourceName}
          </span>
          {count > 1 && (
            <span className="ml-2 flex items-center gap-1.5" aria-label={`Фото ${index + 1} из ${count}`}>
              {photos.map((p, i) => (
                <span
                  key={p.name}
                  aria-hidden="true"
                  className={`block h-2 w-2 rounded-full ${i === index ? 'bg-accent' : 'bg-[rgba(244,234,223,0.4)]'}`}
                />
              ))}
            </span>
          )}
        </figcaption>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Предыдущее фото" className={`${arrow} left-2 md:-left-14`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12.5 4 6.5 10l6 6" />
              </svg>
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Следующее фото" className={`${arrow} right-2 md:-right-14`}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m7.5 4 6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </figure>
    </div>
  )
}
