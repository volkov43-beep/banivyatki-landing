import CrossSectionDiagram from './CrossSectionDiagram.jsx'
import AdvantageItem from './AdvantageItem.jsx'
import PhotoSlot from './PhotoSlot.jsx'
import FrameJointDiagram from './diagrams/FrameJointDiagram.jsx'
import DrainFloorDiagram from './diagrams/DrainFloorDiagram.jsx'
import BodyCurveDiagram from './diagrams/BodyCurveDiagram.jsx'

/**
 * Экран «Чем подкова отличается от бани-бочки».
 * Тёмный фон ink, светлый текст — отдельная глава страницы.
 */
export default function SectionComparison() {
  return (
    <section
      aria-labelledby="comparison-title"
      className="bg-ink py-section-y text-surface md:py-section-y-lg"
    >
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="comparison-title" className="max-w-[24ch] text-heading">
          Чем подкова отличается от бани‑бочки
        </h2>

        <div className="mt-12 md:mt-16">
          <CrossSectionDiagram />
        </div>

        <p className="mt-12 max-w-measure border-l-2 border-accent pl-6 text-lead md:mt-16">
          В бочке пол круглый, поэтому внутрь кладут трапик. Сделаете его широким — он
          поднимется вверх, и вы ходите пригнувшись. Сделаете низким — он шириной
          40&nbsp;сантиметров. У подковы пол прямой, два метра шириной. Всё, что вы
          видите, — ваше пространство.
        </p>

        <ul className="mt-14 grid list-none gap-x-12 gap-y-10 p-0 md:mt-20 md:grid-cols-2">
          <AdvantageItem title={'Ширина 2,4 метра, пол — 2 метра'}>
            У бочки корпус 2 метра и узкий трапик. Паритесь семьёй, не задевая друг друга.
          </AdvantageItem>

          <AdvantageItem
            title="Без стяжек, на обвязке"
            diagram={<FrameJointDiagram />}
            photo={
              <PhotoSlot
                src=""
                alt="Обвязка подковы на производстве: стены-дуги закреплены в силовой раме"
                caption="Обвязка на производстве, пока не зашита: стены-дуги закреплены в силовой раме"
              />
            }
          >
            У бань-бочек стяжки надо периодически подтягивать, пружинные лопаются. Подкова стоит
            на обвязке — стены-дуги закреплены в силовой раме. Подтягивать нечего и лопаться
            нечему, геометрия держится сама.
          </AdvantageItem>

          <AdvantageItem
            title="Двойной проливной пол"
            diagram={<DrainFloorDiagram />}
            photo={
              <PhotoSlot
                src=""
                alt="Двойной проливной пол: верхний настил с зазорами над утеплённым полом"
                caption="Проливной пол в круглогодичной комплектации: настил с зазорами над утеплённым полом"
              />
            }
          >
            Верхний настил с зазорами 4–5 мм, вода уходит на нижний утеплённый. Доски съёмные:
            устала через годы — открутил и заменил за вечер. В бочке ради одной доски пола
            вскрывают полстены.
          </AdvantageItem>

          <AdvantageItem title="Дуга стен по форме тела" diagram={<BodyCurveDiagram />}>
            Спинка обнимает — сидите долго, спина не затекает.
          </AdvantageItem>
        </ul>

        <p className="mt-10 max-w-measure text-label text-muted-on-dark md:mt-12">
          Двойной проливной пол — в круглогодичных комплектациях. В готовом решении пол
          одинарный, с разуклонкой под слив.
        </p>
      </div>
    </section>
  )
}
