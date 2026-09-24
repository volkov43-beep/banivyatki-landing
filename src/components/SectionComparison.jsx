import CrossSectionDiagram from './CrossSectionDiagram.jsx'
import AdvantageItem from './AdvantageItem.jsx'
import PhotoSlot from './PhotoSlot.jsx'
import Button from './Button.jsx'
import { requestCalcOpen } from '../lib/calc.js'
import { track } from '../lib/track.js'
import LabeledDrawing from './diagrams/LabeledDrawing.jsx'
import DrainFloorDiagram from './diagrams/DrainFloorDiagram.jsx'
import { BathChip, BathLegend, BathMark, BathMarkAt, BathMarksRow, CompareStrips } from './comparison/BathMarks.jsx'

/**
 * Экран «Чем Подкова отличается от бани-бочки».
 * Тёмный фон ink, светлый текст — отдельная глава страницы.
 *
 * Чтобы было видно, где бочка, а где Подкова: легенда под схемой, в каждой
 * карточке полосы «Баня-бочка» (alert-on-dark, круг) и «Подкова» (podkova,
 * арка), метки с иконками под чертежом, где нарисованы обе бани. Правило:
 * ни одной картинки или подписи, про которую непонятно, чья она, — всё про
 * нашу баню помечено чипом «Подкова» вплотную к картинке или подписи.
 */
export default function SectionComparison() {
  return (
    <section
      aria-labelledby="comparison-title"
      className="bg-ink py-section-y text-surface md:py-section-y-lg"
    >
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="comparison-title" className="mx-auto max-w-[24ch] text-center text-heading">
          Чем Подкова отличается от бани‑бочки
        </h2>

        <div className="mt-12 md:mt-16">
          <CrossSectionDiagram />
        </div>

        <BathLegend className="mt-6" />

        <p className="mt-12 max-w-measure border-l-2 border-accent pl-6 text-lead md:mt-16">
          В бочке пол круглый, поэтому внутрь кладут трапик. Сделаете его широким — он
          поднимется вверх, и вы ходите пригнувшись. Сделаете низким — он шириной
          40&nbsp;сантиметров. У Подковы пол прямой, два метра шириной. Всё, что вы
          видите, — ваше пространство.
        </p>

        {/* Четыре блока: от 1024 px сетка 2 × 2 по верхнему краю, до 1023 px одна колонка.
            Порядок в каждом: заголовок → схема → текст → фото → подпись. */}
        <ul className="mt-14 grid list-none items-start gap-x-12 gap-y-10 p-0 md:mt-20 lg:grid-cols-2">
          <AdvantageItem
            title={'Ширина 2,4 метра, пол — 2 метра'}
            strips={
              <CompareStrips
                barrel={[
                  'Круглый пол, внутри кладут трапик 40 см. Шире — поднимается вверх, ниже — ходишь пригнувшись.',
                  'У бочки корпус 2 метра и узкий трапик, париться сложно, не задевая друг друга.',
                ]}
                podkova="Прямой пол два метра шириной, от стены до стены. Паритесь втроём, не задевая друг друга."
              />
            }
            photo={
              <>
                <BathChip />
                <PhotoSlot
                  src="photos/shirina-parnaya.webp"
                  width={1120}
                  height={1120}
                  aspect="1 / 1"
                  className="rounded-md"
                  alt="Парная бани-Подковы изнутри"
                  caption="Парная изнутри: прямой пол от стены до стены"
                />
              </>
            }
          />

          <AdvantageItem
            title="Без стяжек, на обвязке"
            strips={
              <CompareStrips
                barrel="Стены держит стальная стяжка: её нужно периодически подтягивать, а пружинные лопаются."
                podkova={[
                  'Стены-дуги закреплены в силовой раме — обвязке. Подтягивать нечего и лопаться нечему, геометрия держится сама.',
                  'Стены собраны из доски с лунным пазом: каждая доска входит в соседнюю плотно, как в замок. Стыки без щелей, доски не расходятся, конопатить ничего не нужно. Паз смотрит вниз — вода стекает по стене и не попадает в стык.',
                ]}
              />
            }
            diagram={
              <LabeledDrawing
                src="photos/diagram-obvyazka.webp"
                width={1440}
                height={850}
                label="Сравнение: бочка держится на стальной стяжке, Подкова стоит на обвязке, доски стен соединены лунным пазом"
                labels={[
                  {
                    n: 1,
                    x: 383,
                    y: 714,
                    anchor: 'middle',
                    lines: ['Бочка: стены держит', 'стальная стяжка —', 'её нужно подтягивать'],
                    badge: [383, 730],
                  },
                  {
                    n: 2,
                    x: 1092,
                    y: 714,
                    anchor: 'middle',
                    lines: ['Подкова: стены закреплены', 'в обвязке —', 'стягивать нечего'],
                    badge: [1092, 730],
                  },
                  {
                    n: 3,
                    x: 1112,
                    y: 469,
                    anchor: 'middle',
                    lines: ['Лунный паз:', 'вода стекает,', 'в стык не попадает'],
                    leader: { from: [1190, 436], to: [1190, 391] },
                    badge: [1112, 500],
                    note: <BathMark kind="podkova" />,
                  },
                ]}
                // Центры бань по пикселям файла: бочка x 383, Подкова x 1092 из 1440
                footer={<BathMarksRow centers={{ barrel: 383 / 1440, podkova: 1092 / 1440 }} />}
                // Над лупой с лунным пазом: центр кольца x 1113, верх y 203 из 1440 × 850
                overlay={<BathMarkAt x={1113 / 1440} y={190 / 850} />}
              />
            }
            photo={
              <>
                <BathChip />
                <PhotoSlot
                  src="photos/obvyazka.webp"
                  width={1120}
                  height={840}
                  className="rounded-md"
                  alt="Обвязка бани-Подковы на производстве"
                  caption="Обвязка на производстве: силовая рама из бруса с двойной пропиткой. На неё встают стены-дуги."
                />
              </>
            }
          />

          <AdvantageItem
            title="Двойной проливной пол"
            strips={
              <CompareStrips
                barrel="Пол одинарный, вода уходит через щели между досками прямо под баню."
                podkova="Верхний настил с зазорами, под ним второй утеплённый пол с уклоном. Доски настила съёмные."
              />
            }
            diagram={
              <>
                <BathChip />
                <DrainFloorDiagram />
              </>
            }
            photo={
              <>
                {/* Пара: слева вид сверху, справа макет в разрезе. До 600 px — друг под другом. */}
                <div className="grid gap-3 min-[600px]:grid-cols-2">
                  <div>
                    <BathChip />
                    <PhotoSlot
                      src="photos/prolivnoy-pol-sverhu.webp"
                      width={600}
                      height={450}
                      className="rounded-md"
                      captionClass="text-[13px]"
                      alt="Верхний настил проливного пола"
                      caption="Сверху: настил с зазорами 4–5 мм"
                    />
                  </div>
                  <div>
                    <BathChip />
                    <PhotoSlot
                      src="photos/prolivnoy-pol-razrez.webp"
                      width={600}
                      height={450}
                      className="rounded-md"
                      captionClass="text-[13px]"
                      alt="Макет проливного пола в разрезе"
                      caption="В разрезе: под настилом — нижний утеплённый пол с уклоном к сливу"
                    />
                  </div>
                </div>
                {/* Сноска про комплектации Подковы: «пол одинарный» без метки читался бы как про бочку */}
                <BathChip className="mb-2 mt-4" />
                <p className="max-w-measure text-label text-muted-on-dark">
                  Двойной проливной пол — в круглогодичных комплектациях. В готовом решении пол
                  одинарный, с разуклонкой под слив.
                </p>
              </>
            }
          >
            Верхний настил с зазорами 4–5 мм, вода уходит на нижний утеплённый. Доски съёмные:
            устала через годы — открутил и заменил за вечер. В бочке ради одной доски пола
            вскрывают полстены.
          </AdvantageItem>

          <AdvantageItem
            title="Дуга стен по форме тела"
            strips={
              <CompareStrips
                barrel="Стена круглая: спина упирается в дугу только в одной точке."
                podkova="Стена идёт дугой по форме спины — опора от поясницы до лопаток."
              />
            }
            diagram={
              <>
                <BathChip />
                <LabeledDrawing
                  src="photos/diagram-duga.webp"
                  width={1440}
                  height={1362}
                  label="Человек сидит в бане-Подкове, спина опирается на изогнутую стену"
                  labels={[
                    {
                      n: 1,
                      x: 560,
                      y: 660,
                      lines: ['Спина лежит', 'на дуге стены'],
                      leader: { from: [548, 648], to: [178, 610] },
                      badge: [600, 650],
                    },
                    {
                      n: 2,
                      x: 560,
                      y: 800,
                      lines: ['Стена поддерживает', 'всю спину, от поясницы', 'до лопаток'],
                      leader: { from: [548, 788], to: [161, 751] },
                      badge: [600, 800],
                    },
                  ]}
                />
              </>
            }
          >
            <BathChip className="mb-2" />
            <p>Спинка обнимает — сидите долго, спина не затекает.</p>
          </AdvantageItem>
        </ul>

        {/* Подводка и главная кнопка по центру — в калькулятор без выбора сезона и размера */}
        <div className="mt-12 flex flex-col items-center text-center md:mt-16">
          <p className="max-w-measure text-lead">Посчитаем стоимость под ваш участок и комплектацию.</p>
          <Button
            arrow
            fullMobile
            className="mt-8"
            onClick={() => {
              track('compare_cta')
              requestCalcOpen()
            }}
          >
            Узнать цену Подковы
          </Button>
        </div>
      </div>
    </section>
  )
}
