import { useEffect, useRef, useState } from 'react'
import Segmented from './calculator/Segmented.jsx'
import CalculatorCard from './calculator/CalculatorCard.jsx'
import LeadForm from './calculator/LeadForm.jsx'
import { SEASONS, CARDS, WARM_NOTES, QUOTE, BUSINESS, formatPrice } from '../data/calculator.js'
import { track } from '../lib/track.js'

const TABS = [
  { id: 'self', label: 'Себе' },
  { id: 'business', label: 'Для бизнеса' },
]

/**
 * Калькулятор стоимости. Грубый намеренно: цена видна без клика,
 * три варианта, телефон. Допы и комплектации собирает менеджер.
 * Единственное место на странице с ценами.
 */
export default function SectionCalculator() {
  const [tab, setTab] = useState('self')
  const [season, setSeason] = useState('warm')
  const [selectedId, setSelectedId] = useState(null)
  const formRef = useRef(null)
  const cardRefs = useRef([])
  const scrollPending = useRef(false)

  const cards = CARDS[season]
  const selected = cards.find((c) => c.id === selectedId) || null
  const insulated = season === 'year'

  function changeTab(next) {
    if (next === tab) return
    setTab(next)
    if (next === 'business') track('business_tab_open')
  }

  function changeSeason(next) {
    if (next === season) return
    setSeason(next)
    // Выбранный вариант переносим на тот же размер в другом сезоне
    if (selectedId) setSelectedId(selectedId.replace(/^(warm|year)/, next))
    track('calc_season_change', { season: next })
  }

  function select(card) {
    setSelectedId(card.id)
    track('calc_card_select', { card_id: card.id })
    scrollPending.current = window.matchMedia('(max-width: 1023px)').matches
  }

  // Плавная прокрутка к форме на телефоне после выбора карточки
  useEffect(() => {
    if (!scrollPending.current || !formRef.current) return
    scrollPending.current = false
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    formRef.current.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [selectedId])

  function onGroupKeyDown(e) {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    const step = keys[e.key]
    if (!step) return
    e.preventDefault()
    const current = cards.findIndex((c) => c.id === selectedId)
    const from = current === -1 ? (step > 0 ? -1 : 0) : current
    const next = (from + step + cards.length) % cards.length
    select(cards[next])
    cardRefs.current[next]?.focus()
  }

  const selectedIndex = cards.findIndex((c) => c.id === selectedId)

  return (
    <section id="calculator" aria-labelledby="calculator-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="calculator-title" className="text-heading">
          Сколько стоит
        </h2>

        <div className="mt-8">
          <Segmented label="Для кого баня" options={TABS} value={tab} onChange={changeTab} full />
        </div>

        {tab === 'self' ? (
          <>
            <div className="mt-8">
              <p className="text-body font-bold">Как планируете пользоваться?</p>
              <div className="mt-3">
                <Segmented label="Сезон" options={SEASONS} value={season} onChange={changeSeason} full />
              </div>
            </div>

            <div
              role="radiogroup"
              aria-label="Вариант бани"
              onKeyDown={onGroupKeyDown}
              className="mt-8 grid gap-6 lg:grid-cols-3"
            >
              {cards.map((card, index) => (
                <CalculatorCard
                  key={card.id}
                  card={card}
                  insulated={insulated}
                  selected={card.id === selectedId}
                  tabIndex={selectedIndex === -1 ? (index === 0 ? 0 : -1) : card.id === selectedId ? 0 : -1}
                  onSelect={() => select(card)}
                  cardRef={(el) => {
                    cardRefs.current[index] = el
                  }}
                />
              ))}
            </div>

            {season === 'warm' && (
              <div className="mt-6 max-w-measure text-[15px] leading-normal text-muted">
                {WARM_NOTES.map((note) => (
                  <p key={note} className="mt-2 first:mt-0">
                    {note}
                  </p>
                ))}
              </div>
            )}

            <p className="mt-8 max-w-measure border-l-2 border-accent pl-6 text-[18px] leading-[1.45]">{QUOTE}</p>

            {selected && (
              <div className="mx-auto mt-10 max-w-[560px] scroll-mt-6 lg:mt-14">
                <LeadForm
                  key={`calculator-${season}`}
                  formRef={formRef}
                  variant="calculator"
                  goal="calc_submit"
                  submitLabel="Получить расчёт"
                  summary={`${SEASONS.find((s) => s.id === season).short}, ${selected.size}, ${formatPrice(selected.price)}`}
                  lead={{
                    season,
                    card_id: selected.id,
                    card_title: selected.title,
                    size: selected.size,
                    price_shown: selected.price,
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="max-w-measure text-body">
              <p>{BUSINESS.intro}</p>
              <ul className="mt-2 list-none p-0">
                {BUSINESS.items.map((item) => (
                  <li key={item} className="flex items-start">
                    <span aria-hidden="true" className="mr-3 mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4">{BUSINESS.outro}</p>
            </div>
            <div className="max-w-[560px]">
              <LeadForm variant="business" goal="business_submit" submitLabel="Обсудить проект" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
