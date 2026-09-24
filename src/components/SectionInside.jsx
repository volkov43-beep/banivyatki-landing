import PhotoSlot from './PhotoSlot.jsx'
import ResponsivePhoto from './ResponsivePhoto.jsx'
import AnnotatedPhoto from './AnnotatedPhoto.jsx'
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
 * Фото слива — AnnotatedPhoto: крышку люка на снимке почти не видно,
 * поверх — рамка и подпись «крышка люка».
 *
 * Разделы открываются разделителем SectionDivider: капсула с названием
 * по центру и тонкие линии до краёв; отступ над ним больше, чем между темами.
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
          'Мягкая черепица Технониколь Shinglas. Кровельщики ставят её массово, и в отзывах чаще всего отмечают одно и то же: не течёт, держит ветер, со временем не трескается и не осыпается.',
          'Мы не экономим на том, что скрыто под черепицей. В комплектации Люкс укладываем подкладочный ковёр — второй слой гидроизоляции, как на жилых домах. В Комфорте под черепицей изолон.',
          'Крыша — первое, что начинает течь у дешёвых бань. Поэтому материал берём у проверенных поставщиков и не меняем на то, что подешевле.',
        ],
      },
    ],
  },
]

/** «Мелочи, которые замечаешь потом»: две карточки рядом, на телефоне друг под другом. */
const DETAILS_TITLE = 'Мелочи, которые замечаешь потом'
const DETAILS = [
  {
    title: 'Фурнитура',
    visual: photo('vnutri-ruchka-dveri', 'Резная деревянная ручка двери бани-Подковы'),
    text: 'К мелочам относимся так же внимательно, как к печи и полкам: фурнитуру подбираем под баню, а не ставим первую попавшуюся. Такие детали замечаешь каждый раз, когда открываешь дверь.',
  },
  {
    title: 'Слив под рукой',
    visual: <DrainPhoto />,
    text: 'Слив открывается рукой: поднял крышку, убрал листья, закрыл. Не нужно вскрывать пол и искать, где засорилось.',
  },
]

/**
 * Фото слива с пометкой. Координаты — в пикселях файла 1280 × 960: крышка
 * люка по швам занимает x 395–890, y 468–570; подпись — на светлой стене
 * между стойками полка (x 390–890, y 200–400), крышку не перекрывает.
 */
function DrainPhoto() {
  return (
    <AnnotatedPhoto name="vnutri-sliv" alt="Крышка люка в настиле бани-Подковы">
      <rect
        x="380"
        y="454"
        width="524"
        height="130"
        rx="22"
        fill="none"
        className="stroke-accent"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1="642"
        y1="376"
        x2="642"
        y2="454"
        className="stroke-accent"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <text x="642" y="358" textAnchor="middle" className="dg-label fill-accent" style={{ fontWeight: 700 }}>
        крышка люка
      </text>
    </AnnotatedPhoto>
  )
}

/**
 * Разделитель раздела: капсула с названием по центру, линии до краёв.
 * Текст не переносится, поэтому на узких телефонах капсула компактнее:
 * «Мелочи, которые замечаешь потом» при 13 px не оставляет места линиям
 * уже 480 px (до 479 — 12 px, до 379 — 11 px).
 */
function SectionDivider({ children }) {
  return (
    <div className="flex items-center gap-3 max-[479px]:gap-2 md:gap-4">
      <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-muted" />
      <h3 className="whitespace-nowrap rounded-full border-[1.5px] border-accent px-[18px] py-[7px] text-[13px] font-bold uppercase leading-none tracking-[0.08em] text-accent max-[479px]:px-[14px] max-[479px]:text-[12px] max-[479px]:tracking-[0.06em] max-[379px]:text-[11px]">
        {children}
      </h3>
      <span aria-hidden="true" className="h-px min-w-2 flex-1 bg-muted" />
    </div>
  )
}

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

        {SECTIONS.map((section, i) => (
          <div key={section.title} className={i === 0 ? 'mt-28 md:mt-40' : 'mt-20 md:mt-28'}>
            <SectionDivider>{section.title}</SectionDivider>
            <ul className="list-none p-0">
              {section.items.map((block) => {
                const visualRight = row++ % 2 === 1
                return (
                  <li
                    key={block.title}
                    className="grid items-center gap-x-12 gap-y-6 border-t border-muted py-10 first:border-t-0 md:grid-cols-2 md:py-14"
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
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        <div className="mt-20 md:mt-28">
          <SectionDivider>{DETAILS_TITLE}</SectionDivider>
          <ul className="mt-10 grid list-none gap-8 p-0 md:mt-14 md:grid-cols-2 md:gap-12">
            {DETAILS.map((item) => (
              <li key={item.title}>
                {item.visual}
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
