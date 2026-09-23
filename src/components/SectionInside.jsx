import PhotoSlot from './PhotoSlot.jsx'
import Button from './Button.jsx'
import VentilationDiagram from './diagrams/VentilationDiagram.jsx'
import WallSectionDiagram from './diagrams/WallSectionDiagram.jsx'
import RoofDiagram from './diagrams/RoofDiagram.jsx'

/**
 * Экран «Что внутри». Светлый фон surface, тёмный текст.
 * Пять блоков чередующимися строками: визуал слева / текст справа, затем наоборот.
 * На мобильном визуал над текстом.
 */
const BLOCKS = [
  {
    title: 'Вентиляция «живая баня»',
    visual: <VentilationDiagram />,
    paragraphs: [
      'Приточка с шибером под печью, вытяжной вентилятор на 220 вольт, форточка. Большинство делают просто отверстие в стене: есть ветер — тянет, нет ветра — не тянет. Здесь работает всегда.',
      'После такой бани — лёгкость, а не тяжёлая голова. Та же система просушивает баню после парения, а сухая баня служит дольше.',
    ],
  },
  {
    title: 'Утепление парной',
    visual: <WallSectionDiagram />,
    paragraphs: [
      'Фольгированный утеплитель 5 мм по всему контуру парной работает как термос. Протапливается за 40 минут до часа и держит тепло.',
      'Между утеплителем и вагонкой — вентиляционный зазор на рейках, низ купола открыт. Воздух просушивает контур, а фольга работает водоотводом: конденсат стекает по ней вниз, а не впитывается в дерево.',
    ],
  },
  {
    title: 'Печь',
    visual: (
      <PhotoSlot
        scheme="light"
        src="photos/pech.webp"
        width={1200}
        height={1799}
        aspect="1 / 1"
        objectPosition="center 42%"
        alt="Печь с открытой каменкой: сетка с камнями, труба-сэндвич, защитные плиты за печью"
      />
    ),
    paragraphs: [
      'Печь на 12 киловатт с запасом мощности, 60 килограммов камней, открытая каменка для русского парения — плеснул и сразу пар.',
      'Стенка 6 миллиметров, портал 8. У дешёвых печей — 4. Два самых опасных узла, портал и проход трубы, закрыты фиброцементными плитами с негорючей прослойкой, труба — сэндвич с мастер-флэшем.',
    ],
  },
  {
    title: 'Дерево по задачам',
    visual: (
      <PhotoSlot
        scheme="light"
        src="photos/derevo.webp"
        width={1200}
        height={800}
        aspect="4 / 3"
        alt="Доски пола крупным планом: текстура дерева"
      />
    ),
    paragraphs: [
      'В парилке липа и осина — без смолы, не обжигают кожу даже на верхнем полке. Каркас и наружная обшивка — хвоя: её смола, наоборот, консервирует древесину снаружи.',
      'Пол в верхней комплектации — лиственница, единственное дерево, которое от воды становится твёрже.',
    ],
  },
  {
    title: 'Кровля',
    visual: <RoofDiagram />,
    paragraphs: [
      'Мягкая черепица Технониколь. Бренд открытый — характеристики можно проверить на сайте производителя.',
    ],
    footnote: 'Подкладочный ковёр под черепицей — в верхней комплектации. В средней — изолон.',
  },
]

export default function SectionInside() {
  return (
    <section aria-labelledby="inside-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="inside-title" className="text-center text-heading">
          Что внутри
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">
          Всё, что влияет на пар, тепло и срок службы — с цифрами.
        </p>

        <ul className="mt-12 list-none p-0 md:mt-16">
          {BLOCKS.map((block, index) => {
            const visualRight = index % 2 === 1
            return (
              <li
                key={block.title}
                className="grid items-center gap-x-12 gap-y-6 border-t border-muted py-10 md:grid-cols-2 md:py-14"
              >
                <div className={visualRight ? 'md:order-2' : ''}>{block.visual}</div>
                <div className={visualRight ? 'md:order-1' : ''}>
                  <h3 className="text-title">{block.title}</h3>
                  {block.paragraphs.map((text) => (
                    <p key={text} className="mt-4 max-w-measure text-body">
                      {text}
                    </p>
                  ))}
                  {block.footnote && (
                    <p className="mt-4 max-w-measure text-label text-muted">{block.footnote}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {/* Приглашение проверить — единственная кнопка на экране */}
        <div className="mt-6 flex flex-col items-center border-t-2 border-accent pt-8 text-center">
          <p className="max-w-measure text-lead">
            Всё, что здесь написано, можно проверить: приезжайте в шоурум и посмотрите вживую.
          </p>
          <Button as="a" href="#showroom" arrow fullMobile className="mt-8">
            Посмотреть баню вживую
          </Button>
        </div>
      </div>
    </section>
  )
}
