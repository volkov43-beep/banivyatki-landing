import CrossSectionDiagram from './CrossSectionDiagram.jsx'
import AdvantageItem from './AdvantageItem.jsx'

const ADVANTAGES = [
  {
    title: 'Ширина 2,4 метра, пол — 2 метра',
    text: 'У бочки корпус 2 метра и узкий трапик. Паритесь семьёй, не задевая друг друга.',
  },
  {
    title: 'Без стяжек',
    text: 'У бань-бочек стяжки надо периодически подтягивать, пружинные лопаются. Здесь конструкция держится на обвязке — нечего подтягивать и нечему лопаться.',
  },
  {
    title: 'Двойной проливной пол',
    text: 'Верхний настил с зазорами 4–5 мм, вода уходит на нижний утеплённый. Доски съёмные: устала через годы — открутил и заменил за вечер. В бочке ради одной доски пола вскрывают полстены.',
  },
  {
    title: 'Дуга стен по форме тела',
    text: 'Спинка обнимает — сидите долго, спина не затекает.',
  },
]

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
          {ADVANTAGES.map((item) => (
            <AdvantageItem key={item.title} title={item.title}>
              {item.text}
            </AdvantageItem>
          ))}
        </ul>

        <p className="mt-10 max-w-measure text-label text-muted-on-dark md:mt-12">
          Двойной проливной пол — в круглогодичных комплектациях. В готовом решении пол
          одинарный, с разуклонкой под слив.
        </p>
      </div>
    </section>
  )
}
