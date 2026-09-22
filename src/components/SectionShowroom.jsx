import { useRef, useState } from 'react'
import VisitCard from './showroom/VisitCard.jsx'
import VisitForm from './showroom/VisitForm.jsx'
import { track } from '../lib/track.js'
import { VISIT_TITLE, VISIT_SUBTITLE, SHOWROOM, PRODUCTION, VIDEO } from '../data/visit.js'

/**
 * Экран «Посмотрите баню до покупки» (#showroom, сюда ведёт кнопка из «Что
 * внутри»). Светлый фон surface, заголовок и подзаголовок по центру, ниже
 * три карточки: шоурум (фото слева), производство (зеркально), видеозвонок
 * (компактная, фото на треть), под ними одна форма записи на forest.
 *
 * Кнопка в карточке: цель visit_button с типом, выбор способа в форме и
 * плавная прокрутка к ней (без анимации, если включён reduced-motion).
 */
export default function SectionShowroom() {
  const [visitType, setVisitType] = useState(SHOWROOM.id)
  const formRef = useRef(null)

  function handleVisit(id) {
    setVisitType(id)
    track('visit_button', { type: id })
    const el = formRef.current
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <section id="showroom" aria-labelledby="showroom-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="showroom-title" className="text-center text-heading">
          {VISIT_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{VISIT_SUBTITLE}</p>

        <div className="mt-12 flex flex-col gap-8 md:mt-16">
          <VisitCard card={SHOWROOM} onVisit={handleVisit} />
          <VisitCard card={PRODUCTION} reverse numbered onVisit={handleVisit} />
          <VisitCard card={VIDEO} compact onVisit={handleVisit} />
          <VisitForm ref={formRef} visitType={visitType} onVisitTypeChange={setVisitType} />
        </div>
      </div>
    </section>
  )
}
