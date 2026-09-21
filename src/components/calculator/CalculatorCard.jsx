import FloorPlan from './FloorPlan.jsx'
import { LAYOUTS, formatPrice } from '../../data/calculator.js'

const BASE = import.meta.env.BASE_URL

/**
 * Карточка варианта. Вся карточка — радиокнопка: кликабельна целиком,
 * выбирается с клавиатуры, видимый фокус, aria-checked.
 * Кнопка «Выбрать» внутри — только визуальная, чтобы не вкладывать
 * интерактивный элемент в интерактивный.
 */
export default function CalculatorCard({ card, selected, insulated, tabIndex, onSelect, cardRef }) {
  return (
    <div
      ref={cardRef}
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`relative flex h-full cursor-pointer flex-col rounded-md border bg-surface p-4 text-ink ${
        selected
          ? 'border-accent shadow-[inset_0_0_0_1px_var(--color-accent)]'
          : 'border-muted'
      }`}
    >
      {selected && (
        <span
          aria-hidden="true"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8.5l3 3 7-7" />
          </svg>
        </span>
      )}

      <img
        src={`${BASE}${card.photo}`}
        alt={`Баня-Подкова ${card.size}`}
        width="800"
        height="600"
        loading="lazy"
        decoding="async"
        className="block aspect-[4/3] w-full rounded object-cover"
      />

      <div className="mt-4">
        <FloorPlan layout={LAYOUTS[card.layout]} insulated={insulated} />
      </div>

      <h3 className="mt-4 text-[20px] font-bold leading-tight">{card.title}</h3>
      <p className="mt-1 text-[15px] text-muted">{card.size}</p>
      <p className="mt-3 text-[28px] font-bold leading-none text-accent">{formatPrice(card.price)}</p>
      <p className="mt-3 text-[15px] leading-snug">{card.inside}</p>
      <p className="mb-5 mt-2 text-label text-muted">{card.delivery}</p>

      <span
        aria-hidden="true"
        className={`mt-auto inline-flex h-12 items-center justify-center rounded px-6 text-body font-bold ${
          selected ? 'bg-accent text-ink' : 'bg-ink text-surface'
        }`}
      >
        {selected ? 'Выбрано' : 'Выбрать'}
      </span>
    </div>
  )
}
