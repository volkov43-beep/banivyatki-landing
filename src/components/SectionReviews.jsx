import { useEffect, useState } from 'react'
import ReviewCard from './ReviewCard.jsx'
import { REVIEWS, SOURCES, MOBILE_VISIBLE } from '../data/reviews.js'
import { track } from '../lib/track.js'

const DESKTOP = '(min-width: 1024px)'

function useDesktop() {
  const [desktop, setDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(DESKTOP).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const onChange = (e) => setDesktop(e.matches)
    mq.addEventListener('change', onChange)
    setDesktop(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return desktop
}

/**
 * Каскад в две колонки без дыр: первые два отзыва открывают обе колонки,
 * остальные по очереди уходят в ту колонку, что пока короче. Высота
 * оценивается по длине текста плюс постоянная часть карточки (метка, подпись,
 * ссылка, поля) — этого достаточно, чтобы колонки заканчивались вровень.
 */
const CARD_OVERHEAD = 160

function splitColumns(reviews) {
  const columns = [[], []]
  const weight = [0, 0]
  reviews.forEach((review, index) => {
    const col = index < 2 ? index : weight[0] <= weight[1] ? 0 : 1
    columns[col].push(review)
    weight[col] += review.text.length + CARD_OVERHEAD
  })
  return columns
}

/**
 * Экран «Отзывы». Светлый фон surface. Каждый отзыв настоящий и проверяемый:
 * имя как на площадке, дата, источник, ссылка на оригинал.
 * От 1024 px — две колонки каскадом; до 1023 px — одна колонка, сначала
 * три отзыва и кнопка «Показать ещё отзывы». Без карусели.
 */
export default function SectionReviews() {
  const desktop = useDesktop()
  const [expanded, setExpanded] = useState(false)

  function showMore() {
    setExpanded(true)
    track('reviews_show_more')
  }

  const mobileList = expanded ? REVIEWS : REVIEWS.slice(0, MOBILE_VISIBLE)
  const hiddenCount = REVIEWS.length - MOBILE_VISIBLE

  return (
    <section id="reviews" aria-labelledby="reviews-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="reviews-title" className="text-heading">
          Что говорят владельцы бань
        </h2>

        {/* Рейтинги — ссылки на площадки, открываются в новой вкладке */}
        <p className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-lead">
          {[SOURCES.avito, SOURCES.yandex].map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('reviews_source_click', { source: source.id })}
              className="text-ink underline decoration-muted underline-offset-4"
            >
              <b className="font-bold">{source.rating}</b> на {source.name}
            </a>
          ))}
        </p>

        {desktop ? (
          <div className="mt-12 grid grid-cols-2 gap-6 md:mt-16">
            {splitColumns(REVIEWS).map((column, i) => (
              <ul key={i} className="flex list-none flex-col gap-6 p-0">
                {column.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </ul>
            ))}
          </div>
        ) : (
          <>
            <ul className="mt-12 flex list-none flex-col gap-6 p-0 md:mt-16">
              {mobileList.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </ul>
            {!expanded && hiddenCount > 0 && (
              <button
                type="button"
                onClick={showMore}
                className="mt-6 inline-flex h-14 w-full items-center justify-center rounded border border-ink px-8 text-body font-bold text-ink"
              >
                Показать ещё отзывы
              </button>
            )}
          </>
        )}
      </div>
    </section>
  )
}
