import { FAQ, plainAnswer } from '../data/faq.js'
import FaqQuestionForm from './FaqQuestionForm.jsx'
import { track } from '../lib/track.js'
import { requestVisit } from '../lib/visit.js'

/**
 * Экран «Частые вопросы». Светлый фон surface, тёмный текст.
 * Аккордеон на <details>/<summary>: по умолчанию всё свёрнуто, открыть можно
 * несколько сразу. Без анимации раскрытия — только поворот значка «+».
 * Один список без подзаголовков групп (на телефоне подзаголовки удлиняют блок).
 * Разметка FAQPage в JSON-LD — для поисковой выдачи.
 * Цель Метрики faq_open с номером вопроса — при каждом раскрытии.
 * Под списком — карточка с формой вопроса (FaqQuestionForm).
 */

/** Ссылка на форму записи (#visit-form): плавная прокрутка и «Шоурум» в форме, цель visit_button с type "faq". */
const VISIT_FORM_HREF = '#visit-form'

function handleVisitLink(e) {
  e.preventDefault()
  requestVisit('showroom', 'faq')
}

/** Текст с ссылками вида [текст](#id) → React-узлы. */
function renderText(text) {
  const parts = text.split(/(\[[^\]]+\]\(#[^)]+\))/g)
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\((#[^)]+)\)$/)
    if (!m) return part
    return (
      <a
        key={i}
        href={m[2]}
        onClick={m[2] === VISIT_FORM_HREF ? handleVisitLink : undefined}
        className="underline decoration-muted underline-offset-4"
      >
        {m[1]}
      </a>
    )
  })
}

function Answer({ item }) {
  return (
    <div className="max-w-measure pb-6 pr-10 text-body">
      {item.text && <p>{renderText(item.text)}</p>}
      {item.list && (
        <ul className={`list-none p-0 ${item.text ? 'mt-3' : ''}`}>
          {item.list.map((line) => (
            <li key={line} className="flex items-start">
              <span aria-hidden="true" className="mr-3 mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      {item.after && <p className="mt-3">{item.after}</p>}
    </div>
  )
}

export default function SectionFaq() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: plainAnswer(item) },
    })),
  }

  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="faq-title" className="text-center text-heading">
          Частые вопросы
        </h2>

        <div className="mt-12 border-b border-muted md:mt-16">
          {FAQ.map((item) => (
            <details
              key={item.n}
              className="group border-t border-muted"
              onToggle={(e) => {
                if (e.currentTarget.open) track('faq_open', { question: item.n })
              }}
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-title [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                {/* Значок «+»: при раскрытии поворачивается в «×» */}
                <span
                  aria-hidden="true"
                  className="relative mt-0.5 h-6 w-6 shrink-0 transition-transform duration-150 group-open:rotate-45"
                >
                  <span className="absolute left-1/2 top-0 h-6 w-0.5 -translate-x-1/2 bg-accent" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-6 -translate-y-1/2 bg-accent" />
                </span>
              </summary>
              <Answer item={item} />
            </details>
          ))}
        </div>

        {/* Не нашли ответ — форма вопроса на фоне forest, ширина как у списка */}
        <div className="mt-10">
          <FaqQuestionForm />
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  )
}
