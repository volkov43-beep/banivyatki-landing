/**
 * Одна из четырёх карточек под схемой.
 * Без рамки и тени: отделяется отступом и тонкой линией сверху.
 * Под заголовком — содержимое карточки: общий чертёж с обеими банями (если
 * есть), затем зона «Баня-бочка» и зона «Подкова» (comparison/BathMarks).
 */
export default function AdvantageItem({ title, children }) {
  return (
    <li className="border-t border-muted-on-dark pt-6">
      <h3 className="text-title">{title}</h3>
      <div className="mt-4 flex flex-col gap-2">{children}</div>
    </li>
  )
}
