/**
 * Один из четырёх блоков под схемой.
 * Без карточки, рамки и тени: отделяется отступом и тонкой линией сверху.
 */
export default function AdvantageItem({ title, children }) {
  return (
    <li className="border-t border-muted pt-6">
      <h3 className="text-title">{title}</h3>
      <p className="mt-3 max-w-measure text-body">{children}</p>
    </li>
  )
}
