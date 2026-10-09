import { useState } from 'react'
import WorkCard from './works/WorkCard.jsx'
import Lightbox from './works/Lightbox.jsx'
import { WORKS, WORKS_TITLE, WORKS_SUBTITLE, WORKS_NOTE } from '../data/works.js'
import { MIN_PRICE, formatPrice } from '../data/calculator.js'
import { requestCalc } from '../lib/calc.js'
import { track } from '../lib/track.js'

/** Карточки работ. Существующая карта вынесена после квиза в SectionLocations. */
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
    <section id="works" aria-labelledby="works-title" className="bg-surface-2 text-ink">
      <div className="mx-auto max-w-container px-gutter py-section-y md:px-gutter-lg md:py-section-y-lg">
        <h2 id="works-title" className="text-center text-heading">
          {WORKS_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{WORKS_SUBTITLE}</p>

        <ul className="mt-12 grid list-none grid-cols-1 gap-x-4 gap-y-8 p-0 min-[600px]:grid-cols-2 md:mt-16 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
          {WORKS.map((work) => (
            <WorkCard key={work.id} work={work} onOpen={openPhoto} onCalc={calc} />
          ))}
        </ul>

        <p className="mx-auto mt-10 max-w-measure text-center text-[15px] leading-[1.45] text-muted md:mt-12">
          {WORKS_NOTE.before}
          <span className="text-price">{formatPrice(MIN_PRICE)}</span>
          {WORKS_NOTE.after}
        </p>
      </div>

      {open && <Lightbox work={open} onClose={() => setOpen(null)} />}
    </section>
  )
}
