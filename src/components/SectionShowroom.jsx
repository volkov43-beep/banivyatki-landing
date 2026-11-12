import { useEffect, useRef, useState } from 'react'
import VisitCard from './showroom/VisitCard.jsx'
import VisitForm from './showroom/VisitForm.jsx'
import { track } from '../lib/track.js'
import { onVisitRequest } from '../lib/visit.js'
import { VISIT_TITLE, VISIT_SUBTITLE, VISIT_CARDS } from '../data/visit.js'

/**
 * Экран «Посмотрите баню до покупки» (#showroom, сюда ведёт кнопка из «Что
 * внутри»). Светлый фон surface, заголовок и подзаголовок по центру, ниже
 * три карточки в порядке региона и одна общая форма записи.
 *
 * Кнопка в карточке: цель visit_button с типом, выбор способа в форме и
 * плавная прокрутка к ней (без анимации, если включён reduced-motion).
 * То же делает запрос снаружи через lib/visit.js (ссылка в FAQ № 17:
 * способ зависит от региона, в цели type "faq").
 */
export default function SectionShowroom({ visit }) {
  const cards = visit?.cards ?? VISIT_CARDS
  const [visitType, setVisitType] = useState(cards[0].id)
  const formRef = useRef(null)

  function handleVisit(id, goal = id) {
    setVisitType(id)
    track('visit_button', { type: goal })
    const el = formRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (el.hasAttribute('tabindex')) el.focus({ preventScroll: true })
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  useEffect(() => onVisitRequest(handleVisit), [])

  return (
    <section id="showroom" aria-labelledby="showroom-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="showroom-title" className="text-center text-heading">
          {VISIT_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{VISIT_SUBTITLE}</p>

        <div className="mt-12 flex flex-col gap-8 md:mt-16">
          {cards.map(card => (
            <VisitCard key={card.id} card={card} reverse={card.reverse} numbered={card.numbered} compact={card.compact} onVisit={handleVisit} />
          ))}
          <VisitForm ref={formRef} visit={visit} options={cards} visitType={visitType} onVisitTypeChange={setVisitType} />
        </div>
      </div>
    </section>
  )
}
