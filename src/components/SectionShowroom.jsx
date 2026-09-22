import VisitCard from './showroom/VisitCard.jsx'
import { VISIT_TITLE, VISIT_SUBTITLE, SHOWROOM } from '../data/visit.js'

/**
 * Экран «Посмотрите баню до покупки» (#showroom, сюда ведёт кнопка из «Что
 * внутри»). Светлый фон surface, заголовок и подзаголовок по центру, ниже
 * карточки способов: шоурум (готово), производство и видеозвонок (следующие
 * задания), под ними общая форма записи.
 */
export default function SectionShowroom() {
  return (
    <section id="showroom" aria-labelledby="showroom-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="showroom-title" className="text-center text-heading">
          {VISIT_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{VISIT_SUBTITLE}</p>

        <div className="mt-12 flex flex-col gap-8 md:mt-16">
          <VisitCard card={SHOWROOM} />
        </div>
      </div>
    </section>
  )
}
