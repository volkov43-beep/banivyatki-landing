import { track } from '../lib/track.js'

/**
 * Экран «Как проходит заказ». Светлый фон surface, тёмный текст.
 * Пять шагов нумерованным списком: номер, название, срок и две колонки
 * «Делаем мы» / «Делаете вы». Главная колонка — «Делаете вы»: она на подложке
 * surface-2 с линией accent слева; там, где покупатель ничего не делает,
 * стоит крупное «Ничего» — это главный смысл блока.
 *
 * Accent здесь только у сроков и колонки «Делаете вы», больше нигде.
 *
 * От 1024 px: номер слева, справа название и срок, под ними две колонки 1fr 1fr.
 * До 1023 px: всё в одну колонку, «Делаем мы» над «Делаете вы».
 * Шаги разделены линией 1 px muted, без карточек с тенями, иконок и анимаций.
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
    you: null, // ничего
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
    you: null, // ничего
  },
]

const SUMMARY = 'Ваша часть — оставить телефон, выбрать баню и показать, где её поставить.'

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
              <span aria-hidden="true" className="text-title tabular-nums lg:text-[40px] lg:leading-none">
                {index + 1}
              </span>

              <div>
                <h3 className="text-[22px] font-bold leading-[1.2]">{step.title}</h3>
                <p className="mt-1 text-[16px] leading-[1.5]">
                  <span className="text-muted">Срок: </span>
                  <b className="font-bold text-accent">{step.term}</b>
                </p>
              </div>

              <div className="col-span-2 mt-5 grid gap-6 lg:col-span-1 lg:col-start-2 lg:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[14px] font-bold leading-[1.2]">Делаем мы</p>
                  <p className="text-[16px] leading-[1.5]">{step.we}</p>
                </div>
                <div className="rounded-md border-l-[3px] border-accent bg-surface-2 p-4">
                  <p className="mb-1.5 text-[14px] font-bold leading-[1.2]">Делаете вы</p>
                  {step.you ? (
                    <p className="text-[16px] leading-[1.5]">{step.you}</p>
                  ) : (
                    <>
                      <p className="text-[20px] font-bold leading-[1.2] text-accent">Ничего</p>
                      <p className="mt-1 text-label text-muted">Мы всё сделаем сами</p>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Итог и единственная кнопка на экране — к калькулятору */}
        <div className="border-t border-muted pt-8">
          <p className="max-w-measure text-[22px] font-bold leading-[1.2]">{SUMMARY}</p>
          <a
            href="#calculator"
            onClick={() => track('process_cta_click')}
            className="mt-8 inline-flex h-14 w-full items-center justify-center rounded bg-accent px-8 text-body font-bold text-ink no-underline lg:w-auto"
          >
            Рассчитать стоимость
          </a>
        </div>
      </div>
    </section>
  )
}
