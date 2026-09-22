import { useLayoutEffect, useRef, useState } from 'react'
import SourceIcon from './SourceIcon.jsx'
import { SOURCES } from '../data/reviews.js'

/**
 * Карточка отзыва: метка-заголовок, текст, подпись «иконка · имя · площадка · дата».
 * Подложка surface-2, скругление 6 px, поля 24 px, линия 3 px accent слева.
 * Без звёзд, аватаров, кавычек-иконок и ссылок на площадки.
 *
 * Текст обрезан до пяти строк с многоточием (line-clamp-5). Если он длиннее — под ним
 * кнопка «Читать полностью», раскрывает текст в той же карточке,
 * повторное нажатие — «Свернуть». Никуда не переходит.
 */
export default function ReviewCard({ review, as: Tag = 'li', className = '', expanded: expandedProp, onToggle }) {
  const source = SOURCES[review.source]
  const textRef = useRef(null)
  // Состояние «раскрыто» можно держать снаружи (блок «Отзывы» хранит его, чтобы
  // не терять при смене раскладки), иначе карточка хранит его сама.
  const [expandedOwn, setExpandedOwn] = useState(false)
  const expanded = expandedProp ?? expandedOwn
  const toggle = onToggle ?? (() => setExpandedOwn((v) => !v))
  const [overflows, setOverflows] = useState(false)

  // Пока текст свёрнут — следим, не вылезает ли он за пять строк (зависит от ширины)
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
    <Tag className={`rounded-md border-l-[3px] border-accent bg-surface-2 p-6 ${className}`}>
      <p className="text-[20px] font-bold leading-[1.2]">{review.label}</p>
      <p
        id={textId}
        ref={textRef}
        className={`mt-[10px] text-[16px] leading-[1.5] ${expanded ? '' : 'line-clamp-5'}`}
      >
        {review.text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={textId}
          className="mt-2 text-label underline"
        >
          {expanded ? 'Свернуть' : 'Читать полностью'}
        </button>
      )}
      <p className="mt-4 flex items-center gap-3 text-label text-muted">
        <SourceIcon source={review.source} size={28} />
        <span>
          {review.author} · {source.name} ·{' '}
          <time dateTime={review.date}>{review.dateText}</time>
        </span>
      </p>
    </Tag>
  )
}
