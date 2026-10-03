import { useLayoutEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { reviewPhotoSrc } from './PhotoViewer.jsx'
import RatingStars from '../RatingStars.jsx'
import SourceIcon from '../SourceIcon.jsx'
import Button from '../Button.jsx'
import { SOURCES } from '../../data/reviews.js'

/**
 * Карточка отзыва владельца (блок «Отзывы»). Сверху вниз:
 * 1. шапка — буквенная аватарка 44 px, имя (16 px, 600, ink) и статус автора
 *    с площадки (13 px, muted);
 * 2. пять залитых звёзд accent 16 px и дата (13 px, muted, всегда с годом);
 * 3. тезис — заголовок карточки (15 px, 700, accent);
 * 4. текст отзыва 15 px ink, высота строки 1,55, до шести строк; длиннее —
 *    ссылка-кнопка «Читать полностью», раскрывает на месте, затем «Свернуть»;
 * 5. фото из отзыва — квадратные миниатюры 72 px, скругление 6 px, зазор
 *    8 px; клик (и Enter) открывает просмотр (PhotoViewer);
 * 6. внизу подпись площадки: круглая иконка 18 px и название, 13 px muted.
 * Подложка surface (блок на surface-2), скругление 6 px, поля 24 px, без
 * тени, слева полоса 3 px accent. Карточка — flex-колонка: в ряду сетки все
 * одной высоты, подпись площадки прижата к низу. Ссылок на площадки нет.
 */
export default function OwnerReviewCard({ review, index, expanded, onToggle, onOpenPhoto }) {
  const textRef = useRef(null)
  const [overflows, setOverflows] = useState(false)
  const source = SOURCES[review.source]

  // Пока текст свёрнут — следим, не вылезает ли он за шесть строк (зависит от ширины)
  useLayoutEffect(() => {
    const el = textRef.current
    if (!el || expanded) return undefined
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1)
    check()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [expanded])

  const textId = `review-text-${review.id}`

  return (
    <li className="flex flex-col rounded-md border-l-[3px] border-accent bg-surface p-6">
      <div className="flex items-center gap-3">
        <Avatar name={review.author} index={index} />
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-[1.25] text-ink">{review.author}</p>
          {review.status && <p className="mt-0.5 text-[13px] leading-[1.3] text-muted">{review.status}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <RatingStars rating={review.rating} id={`stars-${review.id}`} size={16} />
        <time dateTime={review.date} className="text-[13px] leading-none text-muted">
          {review.dateText}
        </time>
      </div>

      <p className="mt-3 text-[15px] font-bold leading-[1.3] text-accent">{review.label}</p>

      <p id={textId} ref={textRef} className={`mt-2 text-[15px] leading-[1.55] text-ink ${expanded ? '' : 'line-clamp-6'}`}>
        {review.text}
      </p>
      {(overflows || expanded) && (
        <Button variant="link" size="sm" onClick={onToggle} aria-expanded={expanded} aria-controls={textId} className="mt-2 self-start">
          {expanded ? 'Свернуть' : 'Читать полностью'}
        </Button>
      )}

      {review.photos.length > 0 && (
        <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
          {review.photos.map((photo, i) => (
            <li key={photo.name} className="m-0 p-0">
              <button
                type="button"
                onClick={(e) => onOpenPhoto(i, e.currentTarget)}
                aria-label={`Открыть фото: ${photo.alt}`}
                className="block h-[72px] w-[72px] cursor-zoom-in overflow-hidden rounded-md p-0"
              >
                <img
                  src={reviewPhotoSrc(photo.name, 320)}
                  srcSet={`${reviewPhotoSrc(photo.name, 320)} 320w`}
                  sizes="72px"
                  alt=""
                  width="72"
                  height="72"
                  loading="lazy"
                  decoding="async"
                  className="block h-[72px] w-[72px] rounded-md object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-auto flex items-center gap-2 pt-4 text-[13px] leading-none text-muted">
        <SourceIcon source={review.source} size={18} />
        <span>{source.name}</span>
      </p>
    </li>
  )
}
