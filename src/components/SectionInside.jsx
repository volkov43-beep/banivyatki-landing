import PhotoSlot from './PhotoSlot.jsx'
import ResponsivePhoto from './ResponsivePhoto.jsx'
import Button from './Button.jsx'

/**
 * Экран «Что внутри». Светлый фон surface, тёмный текст.
 * Три раздела с подзаголовками по центру: «Воздух и тепло» (вентиляция,
 * второе дыхание, утепление), «Материалы» (печь, дерево, кровля) и «Мелочи,
 * которые замечаешь потом» (две карточки: ручка и слив). Темы первых двух
 * разделов идут чередующимися строками: фото слева / текст справа, затем
 * наоборот (чередование сквозное по всем шести темам). На мобильном фото
 * над текстом. Схем в блоке нет — только фотографии; схемы блока сравнения
 * живут в SectionComparison.
 *
 * Фото тем — ResponsivePhoto (1280/640, 4:3 или 3/4 для вертикальных).
 * vnutri-uteplenie пришло только в 684 px, поэтому у него одна ширина 640.
 */
const PHOTO_SIZES = '(min-width: 768px) 552px, 100vw'

const photo = (name, alt, extra = {}) => (
  <ResponsivePhoto name={name} alt={alt} sizes={PHOTO_SIZES} {...extra} />
)

const SECTIONS = [
  {
    title: 'Воздух и тепло',
    items: [
      {
        title: 'Вентиляция «живая баня»',
        visual: photo('vnutri-ventilyaciya', 'Вытяжная решётка вентиляции в бане-Подкове'),
        paragraphs: [
          'Приточка с шибером под печью, вытяжной вентилятор на 220 вольт, форточка. Большинство делают просто отверстие в стене: есть ветер — тянет, нет ветра — не тянет. Здесь работает всегда.',
          'После такой бани — лёгкость, а не тяжёлая голова. Та же система просушивает баню после парения, а сухая баня служит дольше.',
        ],
      },
      {
        title: 'Второе дыхание',
        visual: photo('vnutri-vtoroe-dyhanie', 'Открытый продух второго дыхания в бане-Подкове'),
        caption: 'Продух второго дыхания открывается с полка',
        paragraphs: [
          'Продух открывается прямо с полка. Лежите, тело греется, а к лицу идёт прохладный воздух с улицы — дышится легко даже в самый жар. Обычно именно из-за духоты жёны и дети сидят в парной пять минут и выходят. Со вторым дыханием в баню идут с удовольствием.',
        ],
      },
      {
        title: 'Утепление парной',
        visual: photo('vnutri-uteplenie', 'Фольгированный утеплитель под вагонкой парной', { ratio: '3/4', widths: [640] }),
        paragraphs: [
          'Фольгированный утеплитель 5 мм по всему контуру парной работает как термос. Протапливается за 40 минут до часа и держит тепло.',
          'Между утеплителем и вагонкой — вентиляционный зазор на рейках, низ купола открыт. Воздух просушивает контур, а фольга работает водоотводом: конденсат стекает по ней вниз, а не впитывается в дерево.',
        ],
      },
    ],
  },
  {
    title: 'Материалы',
    items: [
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
            className="rounded-md"
            alt="Печь с открытой каменкой: сетка с камнями, труба-сэндвич, защитные плиты за печью"
          />
        ),
        paragraphs: [
          'Печь на 12 киловатт с запасом мощности, 60 килограммов камней, открытая каменка для русского парения — плеснул и сразу пар.',
          'Стенка 6 миллиметров, портал 8. У дешёвых печей — 4. Два самых опасных узла, портал и проход трубы, закрыты фиброцементными плитами с негорючей прослойкой, труба — сэндвич с мастер-флэшем.',
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
            className="rounded-md"
            alt="Доски пола крупным планом: текстура дерева"
          />
        ),
        paragraphs: [
          'В парилке липа и осина — без смолы, не обжигают кожу даже на верхнем полке. Каркас и наружная обшивка — хвоя: её смола, наоборот, консервирует древесину снаружи.',
          'Пол в верхней комплектации — лиственница, единственное дерево, которое от воды становится твёрже.',
        ],
      },
      {
        title: 'Кровля',
        visual: photo('vnutri-krovlya', 'Мягкая черепица на бане-Подкове'),
        paragraphs: [
          'Мягкая черепица Технониколь. Бренд открытый — характеристики можно проверить на сайте производителя.',
        ],
        footnote: 'Подкладочный ковёр под черепицей — в верхней комплектации. В средней — изолон.',
      },
    ],
  },
]

/** «Мелочи, которые замечаешь потом»: две карточки рядом, на телефоне друг под другом. */
const DETAILS_TITLE = 'Мелочи, которые замечаешь потом'
const DETAILS = [
  {
    title: 'Резная ручка',
    photo: { name: 'vnutri-ruchka-dveri', alt: 'Резная деревянная ручка двери бани-Подковы' },
    text: 'К мелочам относимся так же внимательно, как к печи и полкам: ручку подбираем под баню, а не ставим первую попавшуюся. Такие детали замечаешь каждый раз, когда открываешь дверь.',
  },
  {
    title: 'Слив под рукой',
    photo: { name: 'vnutri-sliv', alt: 'Слив в полу бани-Подковы', ratio: '3/4' },
    text: 'Слив открывается рукой: поднял крышку, убрал листья, закрыл. Не нужно вскрывать пол и искать, где засорилось.',
  },
]

export default function SectionInside() {
  let row = 0
  return (
    <section aria-labelledby="inside-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="inside-title" className="text-center text-heading">
          Что внутри
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">
          Всё, что влияет на пар, тепло и срок службы — с цифрами.
        </p>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mt-16 md:mt-24">
            <h3 className="text-center text-[22px] font-bold leading-[1.2]">{section.title}</h3>
            <ul className="mt-6 list-none p-0 md:mt-8">
              {section.items.map((block) => {
                const visualRight = row++ % 2 === 1
                return (
                  <li
                    key={block.title}
                    className="grid items-center gap-x-12 gap-y-6 border-t border-muted py-10 md:grid-cols-2 md:py-14"
                  >
                    <div className={visualRight ? 'md:order-2' : ''}>
                      {block.visual}
                      {block.caption && <p className="mt-2 text-label leading-[1.2] text-muted">{block.caption}</p>}
                    </div>
                    <div className={visualRight ? 'md:order-1' : ''}>
                      <h4 className="text-title">{block.title}</h4>
                      {block.paragraphs.map((text) => (
                        <p key={text} className="mt-4 max-w-measure text-body">
                          {text}
                        </p>
                      ))}
                      {block.footnote && <p className="mt-4 max-w-measure text-label text-muted">{block.footnote}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <div className="mt-16 border-t border-muted pt-10 md:mt-24 md:pt-14">
          <h3 className="text-center text-[22px] font-bold leading-[1.2]">{DETAILS_TITLE}</h3>
          <ul className="mt-8 grid list-none gap-8 p-0 md:grid-cols-2 md:gap-12">
            {DETAILS.map((item) => (
              <li key={item.title}>
                <ResponsivePhoto name={item.photo.name} alt={item.photo.alt} ratio={item.photo.ratio} sizes={PHOTO_SIZES} />
                <h4 className="mt-5 text-title">{item.title}</h4>
                <p className="mt-3 max-w-measure text-body">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>

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
