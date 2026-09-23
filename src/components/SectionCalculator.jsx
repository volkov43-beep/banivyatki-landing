import { useCallback, useEffect, useRef, useState } from 'react'
import Segmented from './calculator/Segmented.jsx'
import CalculatorCard from './calculator/CalculatorCard.jsx'
import LeadForm from './calculator/LeadForm.jsx'
import ReviewCard from './ReviewCard.jsx'
import Button from './Button.jsx'
import { SEASONS, CARDS, WARM_NOTES, QUOTE, BUSINESS, formatPrice } from '../data/calculator.js'
import { BUSINESS_REVIEW } from '../data/reviews.js'
import { track } from '../lib/track.js'
import { onCalcRequest } from '../lib/calc.js'

const TABS = [
  { id: 'self', label: 'Себе' },
  { id: 'business', label: 'Для бизнеса' },
]

const SCROLL_OFFSET = 96 // верх формы на 96 px ниже верха экрана
const SELECT_PAUSE_MS = 250 // пауза, чтобы человек увидел галочку
const HIGHLIGHT_MS = 1200

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches

function scrollToElement(el) {
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
  window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' })
}

/** Форма считается видимой, если её верх на экране и видно хотя бы 240 px. */
function isInView(el) {
  const r = el.getBoundingClientRect()
  return r.top >= 0 && r.top + Math.min(r.height, 240) <= window.innerHeight
}

/**
 * Калькулятор стоимости. Грубый намеренно: цена видна без клика,
 * три варианта, телефон. Допы и комплектации собирает менеджер.
 * Единственное место на странице с ценами.
 *
 * Порядок: заголовок → цитата → вкладки → сезон → примечания → карточки → форма.
 * После выбора карточки — пауза 250 мс и прокрутка к форме (если она не видна),
 * панель формы на 1,2 с подсвечивается рамкой accent. На телефоне, пока форма
 * за экраном, снизу закреплена полоска с итогом и кнопкой.
 *
 * Запрос снаружи (lib/calc.js, кнопка «Рассчитать такую» в «Наших работах»):
 * вкладка «Себе», сезон и карточка ставятся теми же обработчиками и с теми же
 * целями, что при ручном выборе, но прокрутка идёт к сетке карточек — человек
 * видит цену выбранного размера и соседние варианты; форма остаётся ниже,
 * без автопрокрутки и подсветки.
 */
export default function SectionCalculator() {
  const [tab, setTab] = useState('self')
  const [season, setSeason] = useState('warm')
  const [selectedId, setSelectedId] = useState(null)
  const [selectionTick, setSelectionTick] = useState(0)
  const [cardsScrollTick, setCardsScrollTick] = useState(0)
  const [highlight, setHighlight] = useState(false)
  const [formVisible, setFormVisible] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const sectionRef = useRef(null)
  const panelRef = useRef(null)
  const cardsRef = useRef(null)
  const cardRefs = useRef([])
  const timers = useRef([])

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
    if (card.id !== selectedId) track('calc_card_select', { card_id: card.id })
    setSelectedId(card.id)
    setSelectionTick((t) => t + 1)
  }

  const goToForm = useCallback(() => {
    const panel = panelRef.current
    if (!panel) return
    scrollToElement(panel)
    setHighlight(true)
    timers.current.push(setTimeout(() => setHighlight(false), HIGHLIGHT_MS))
    if (isDesktop()) {
      const phone = panel.querySelector('input[type="tel"]')
      timers.current.push(setTimeout(() => phone?.focus({ preventScroll: true }), reducedMotion() ? 0 : 500))
    }
  }, [])

  // После выбора: пауза, затем прокрутка к форме, если она не на экране.
  // Если форма уже видна (человек сменил карточку) — только обновляется строка-итог.
  useEffect(() => {
    if (!selectionTick || !panelRef.current) return undefined
    const id = setTimeout(() => {
      if (panelRef.current && !isInView(panelRef.current)) goToForm()
    }, SELECT_PAUSE_MS)
    return () => clearTimeout(id)
  }, [selectionTick, goToForm])

  // Видимость формы — для закреплённой полоски на телефоне
  useEffect(() => {
    const panel = panelRef.current
    if (!panel || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting), {
      rootMargin: '0px 0px -64px 0px',
      threshold: 0.05,
    })
    observer.observe(panel)
    return () => observer.disconnect()
  }, [selectedId])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Запрос «рассчитать такую» из блока «Наши работы»: выбор без selectionTick,
  // чтобы не сработала прокрутка к форме; к карточкам прокручиваем после рендера
  useEffect(
    () =>
      onCalcRequest((nextSeason, cardId) => {
        if (!nextSeason && !cardId) {
          // Запрос без выбора («Собрать свою баню»): вкладка «Себе» и к началу блока
          changeTab('self')
          if (sectionRef.current) scrollToElement(sectionRef.current)
          return
        }
        const card = CARDS[nextSeason]?.find((c) => c.id === cardId)
        if (!card) return
        changeTab('self')
        changeSeason(nextSeason)
        if (card.id !== selectedId) track('calc_card_select', { card_id: card.id })
        setSelectedId(card.id)
        setCardsScrollTick((t) => t + 1)
      }),
  )

  useEffect(() => {
    if (cardsScrollTick && cardsRef.current) scrollToElement(cardsRef.current)
  }, [cardsScrollTick])

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
  const summary = selected
    ? `${SEASONS.find((s) => s.id === season).short}, ${selected.size}, ${formatPrice(selected.price)}`
    : ''
  const showBar = tab === 'self' && selected && !formVisible && !submitted

  return (
    <section ref={sectionRef} id="calculator" aria-labelledby="calculator-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="calculator-title" className="text-center text-heading">
          Сколько стоит
        </h2>

        <p className="mt-6 max-w-measure border-l-2 border-accent pl-6 text-[18px] leading-[1.45]">{QUOTE}</p>

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

            {season === 'warm' && (
              <div className="mt-6 max-w-measure text-[15px] leading-normal text-muted">
                {WARM_NOTES.map((note) => (
                  <p key={note} className="mt-2 first:mt-0">
                    {note}
                  </p>
                ))}
              </div>
            )}

            <div
              ref={cardsRef}
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

            {selected && (
              <div
                ref={panelRef}
                className={`mx-auto mt-8 max-w-[560px] rounded-md border bg-surface-2 p-5 transition-[border-color,box-shadow] duration-500 lg:mt-10 lg:p-8 ${
                  highlight ? 'border-accent shadow-[inset_0_0_0_1px_var(--color-accent)]' : 'border-muted'
                }`}
              >
                {!submitted && (
                  <>
                    <h3 className="text-[22px] font-bold leading-tight">Последний шаг — куда прислать расчёт</h3>
                    <p className="mt-2 text-body">
                      Вы выбрали: <b className="font-bold">{summary}</b>{' '}
                      <Button variant="link" size="sm" onClick={() => cardsRef.current && scrollToElement(cardsRef.current)}>
                        изменить
                      </Button>
                    </p>
                  </>
                )}
                <div className={submitted ? '' : 'mt-5'}>
                  <LeadForm
                    variant="calculator"
                    goal="calc_submit"
                    submitLabel="Получить расчёт"
                    onSuccess={() => setSubmitted(true)}
                    lead={{
                      season,
                      card_id: selected.id,
                      card_title: selected.title,
                      size: selected.size,
                      price_shown: selected.price,
                    }}
                  />
                </div>
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
              {/* Один настоящий отзыв арендодателя — в том же оформлении, что и блок «Отзывы» */}
              <ReviewCard review={BUSINESS_REVIEW} as="div" className="mt-8" />
            </div>
            <div className="max-w-[560px]">
              <LeadForm variant="business" goal="business_submit" submitLabel="Обсудить проект" />
            </div>
          </div>
        )}
      </div>

      {/* Закреплённая полоска на телефоне: выбранный вариант и кнопка к форме */}
      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-ink pb-[env(safe-area-inset-bottom)] text-surface lg:hidden">
          <div className="flex h-16 items-center justify-between gap-4 px-4">
            <p className="min-w-0 text-[15px] leading-tight">
              <span className="block truncate">{selected.size}, </span>
              <b className="block truncate font-bold text-accent">{formatPrice(selected.price)}</b>
            </p>
            <Button size="md" onClick={goToForm} className="shrink-0">
              Получить расчёт
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
