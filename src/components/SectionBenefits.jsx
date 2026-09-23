import Button from './Button.jsx'
import BenefitIcon from './benefits/BenefitIcons.jsx'
import { BENEFITS, BENEFITS_TITLE, BENEFITS_SUBTITLE, BENEFITS_BUTTON } from '../data/benefits.js'
import { requestCalcOpen } from '../lib/calc.js'
import { track } from '../lib/track.js'

/**
 * Экран «Что вы получаете» (#benefits) — сразу после первого экрана. Фон
 * forest, заголовок и подзаголовок по центру. Четыре плитки: от 1024 px
 * в ряд, от 600 px 2 × 2, ниже друг под другом; внутри сверху вниз иконка,
 * заголовок, текст; без рамок и коробок — только воздух. Под плитками
 * главная кнопка «Собрать свою баню»: цель benefits_cta и запрос
 * калькулятору без выбора (lib/calc.js): вкладка «Себе», плавная прокрутка.
 */
export default function SectionBenefits() {
  function open() {
    track('benefits_cta')
    requestCalcOpen()
  }

  return (
    <section id="benefits" aria-labelledby="benefits-title" className="bg-forest py-section-y text-surface md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="benefits-title" className="text-center text-heading">
          {BENEFITS_TITLE}
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead text-muted-on-dark">{BENEFITS_SUBTITLE}</p>

        <ul className="mt-12 grid list-none gap-x-8 gap-y-10 p-0 min-[600px]:grid-cols-2 md:mt-16 lg:grid-cols-4 lg:gap-x-10">
          {BENEFITS.map((item) => (
            <li key={item.id}>
              <BenefitIcon name={item.icon} />
              <h3 className="mt-5 text-title">{item.title}</h3>
              <p className="mt-3 text-body text-muted-on-dark">{item.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 text-center md:mt-16">
          <Button onClick={open} fullMobile>
            {BENEFITS_BUTTON}
          </Button>
        </div>
      </div>
    </section>
  )
}
