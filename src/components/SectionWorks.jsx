import { useState } from 'react'
import WorkCard from './works/WorkCard.jsx'
import Lightbox from './works/Lightbox.jsx'
import MapBlock from './works/MapBlock.jsx'
import { WORKS, WORKS_TITLE, WORKS_SUBTITLE } from '../data/works.js'
import { requestCalc } from '../lib/calc.js'
import { track } from '../lib/track.js'

/**
 * Экран «Наши работы» (#works). Светлый фон surface, заголовок и подзаголовок
 * по центру. Сверху шесть карточек объектов (от 1024 px три в ряд, ниже две),
 * под ними карта «Где стоят наши бани» (works/MapBlock) со своим маленьким
 * заголовком — прежний экран карты стал частью этого блока.
 *
 * Клик по фото — увеличение (Lightbox) и цель works_photo_open с названием
 * объекта. «Рассчитать такую» — цель works_calc_click и запрос калькулятору
 * через lib/calc.js: блоки друг о друге не знают.
 */
export default function SectionWorks() {
  const [open, setOpen] = useState(null)

  function openPhoto(work) {
    track('works_photo_open', { name: work.name })
    setOpen(work)
  }

  function calc(work) {
    track('works_calc_click', { name: work.name })
    requestCalc(work.calc.season, work.calc.cardId)
  }

  return (
    <section id="works" aria-labelledby="works-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="works-title" className="text-center text-heading">
          {WORKS_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{WORKS_SUBTITLE}</p>

        <ul className="mt-12 grid list-none grid-cols-2 gap-x-4 gap-y-8 p-0 md:mt-16 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
          {WORKS.map((work) => (
            <WorkCard key={work.id} work={work} onOpen={openPhoto} onCalc={calc} />
          ))}
        </ul>

        <div className="mt-16 md:mt-20">
          <MapBlock />
        </div>
      </div>

      {open && <Lightbox work={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
