import { useState } from 'react'
import OwnerReviewCard from './reviews/OwnerReviewCard.jsx'
import PhotoViewer from './reviews/PhotoViewer.jsx'
import Button from './Button.jsx'
import { REVIEWS, REVIEWS_TITLE, REVIEWS_SUBTITLE, SOURCES, VISIBLE } from '../data/reviews.js'
import { track } from '../lib/track.js'

/**
 * Экран «Отзывы» (#reviews) на surface-2: заголовок и строка-подзаголовок
 * по центру, десять карточек (reviews/OwnerReviewCard, данные data/reviews.js).
 * От 1024 px три в ряд, от 768 px две, ниже одна; в ряду карточки одной
 * высоты. Сначала видны шесть, под ними второстепенная кнопка по центру
 * «Показать ещё N отзывов» — раскрывает остальные на месте, затем
 * «Свернуть». Без карусели, без плашек рейтинга и без ссылок на площадки.
 *
 * Цели: review_expand (раскрыли текст, label — тезис), review_photo_open
 * (открыли фото, label), reviews_show_more (раскрыли остальные карточки).
 */
export default function SectionReviews() {
  const [showAll, setShowAll] = useState(false)
  // Раскрытые тексты храним здесь, чтобы не терять при «Свернуть» списка
  const [openIds, setOpenIds] = useState(() => new Set())
  const [viewer, setViewer] = useState(null) // { review, index }

  function toggleText(review) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(review.id)) next.delete(review.id)
      else {
        next.add(review.id)
        track('review_expand', { label: review.label })
      }
      return next
    })
  }

  function openPhoto(review, index) {
    track('review_photo_open', { label: review.label })
    setViewer({ review, index })
  }

  function toggleAll() {
    if (!showAll) track('reviews_show_more')
    setShowAll((v) => !v)
  }

  const list = showAll ? REVIEWS : REVIEWS.slice(0, VISIBLE)
  const hidden = REVIEWS.length - VISIBLE

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-surface-2 py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="reviews-title" className="text-center text-heading">
          {REVIEWS_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-body text-muted">{REVIEWS_SUBTITLE}</p>

        <ul className="mt-12 grid list-none grid-cols-1 gap-6 p-0 md:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {list.map((review, i) => (
            <OwnerReviewCard
              key={review.id}
              review={review}
              index={i}
              expanded={openIds.has(review.id)}
              onToggle={() => toggleText(review)}
              onOpenPhoto={(index) => openPhoto(review, index)}
            />
          ))}
        </ul>

        {hidden > 0 && (
          <div className="mt-10 text-center md:mt-12">
            <Button variant="secondary" scheme="light" onClick={toggleAll} aria-expanded={showAll} fullMobile>
              {showAll ? 'Свернуть' : `Показать ещё ${hidden} отзыва`}
            </Button>
          </div>
        )}
      </div>

      {viewer && (
        <PhotoViewer
          review={viewer.review}
          sourceName={SOURCES[viewer.review.source].name}
          start={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </section>
  )
}
