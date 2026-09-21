import { track } from '../lib/track.js'

/**
 * Экран «Как проходит заказ». Светлый фон surface, тёмный текст.
 * Пять шагов нумерованным списком: номер, название, срок и две колонки
 * «Делаем мы» / «Делаете вы». Колонка «Делаете вы» тише (muted) —
 * там, где покупатель ничего не делает, так и написано: это главный смысл блока.
 *
 * От 1024 px: номер слева, справа название и срок, под ними две колонки.
 * До 1023 px: всё в одну колонку, «Делаем мы» над «Делаете вы».
 * Шаги разделены линией 1 px muted, без карточек, иконок и анимаций.
 */
const STEPS = [
  {
    title: 'Заявка и расчёт',
    term: '15 минут в рабочее время',
    we: 'Перезваниваем, считаем стоимость под ваш участок.',
    you: 'Оставляете телефон.',
  },
  {
    title: 'Просмотр и договор',
    term: 'Можно в день обращения',
    we: 'Показываем баню вживую в шоуруме или по видеосвязи, фиксируем цену и сроки в договоре.',
    you: 'Приезжаете на Ленина, 71Б или выходите на видеозвонок, вносите небольшой задаток.',
  },
  {
    title: 'Изготовление',
    term: 'От 30 дней, точную дату фиксируем в договоре',
    we: 'Делаем баню на своём производстве в Кирове.',
    you: 'Ничего.',
  },
  {
    title: 'Доставка и установка',
    term: '1 день',
    we: 'Привозим готовую баню и ставим на участке. Если манипулятору не подъехать — собираем на месте за 1–2 дня.',
    you: 'Показываете, где поставить.',
  },
  {
    title: 'Гарантия и обслуживание',
    term: '5 лет',
    we: 'Даём гарантию 5 лет. Каждое ежегодное обслуживание продлевает её ещё на год — приезжаем и делаем всё сами. Условия обслуживания расскажет менеджер.',
    you: 'Ничего.',
  },
]

export default function SectionProcess() {
  return (
    <section id="process" aria-labelledby="process-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="process-title" className="text-heading">
          Как проходит заказ
        </h2>
        <p className="mt-4 max-w-measure text-lead">
          От вас — только участок и пара решений. Остальное делаем мы.
        </p>

        <ol className="mt-12 list-none p-0 md:mt-16">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-[2rem_1fr] gap-x-3 border-t border-muted py-8 lg:grid-cols-[6rem_1fr] lg:gap-x-8 lg:py-10"
            >
              {/* Номер: нумерация есть в <ol>, цифра только для глаз */}
              <span
                aria-hidden="true"
                className="text-title tabular-nums lg:text-[40px] lg:leading-none"
              >
                {index + 1}
              </span>

              <div>
                <h3 className="text-title">{step.title}</h3>
                <p className="mt-1 text-body">
                  <span className="text-muted">Срок: </span>
                  {step.term}
                </p>
              </div>

              <div className="col-span-2 mt-5 grid gap-y-5 lg:col-span-1 lg:col-start-2 lg:grid-cols-2 lg:gap-x-12">
                <div>
                  <p className="text-label">Делаем мы</p>
                  <p className="mt-1 max-w-measure text-body">{step.we}</p>
                </div>
                <div className="text-muted">
                  <p className="text-label">Делаете вы</p>
                  <p className="mt-1 max-w-measure text-body">{step.you}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Единственная кнопка на экране — к калькулятору */}
        <div className="border-t border-muted pt-8">
          <a
            href="#calculator"
            onClick={() => track('process_cta_click')}
            className="inline-flex h-14 w-full items-center justify-center rounded bg-accent px-8 text-body font-bold text-ink no-underline lg:w-auto"
          >
            Рассчитать стоимость
          </a>
        </div>
      </div>
    </section>
  )
}
