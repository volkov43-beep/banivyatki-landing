import { SOURCES } from '../data/reviews.js'
import { track } from '../lib/track.js'

/**
 * Карточка отзыва: метка, текст, имя · источник · дата, ссылка на оригинал.
 * Подложка surface-2, скругление 6 px, поля 24 px, линия 3 px accent слева —
 * как у колонки «Делаете вы» в блоке «Как проходит заказ». Без звёзд,
 * аватаров и кавычек-иконок. Ссылка открывается в новой вкладке.
 */
export default function ReviewCard({ review, as: Tag = 'li', className = '' }) {
  const source = SOURCES[review.source]
  const url = review.url || source.url
  return (
    <Tag className={`rounded-md border-l-[3px] border-accent bg-surface-2 p-6 ${className}`}>
      <p className="text-[13px] font-bold leading-[1.2] text-accent">{review.label}</p>
      <p className="mt-3 text-[16px] leading-[1.5]">{review.text}</p>
      <p className="mt-4 text-label text-muted">
        {review.author} · {source.name} ·{' '}
        <time dateTime={review.date}>{review.dateText}</time>
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('reviews_source_click', { source: source.id })}
        className="mt-2 inline-block text-label underline"
      >
        {source.readLabel}
      </a>
    </Tag>
  )
}
