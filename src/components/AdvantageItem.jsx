/**
 * Один из четырёх блоков под схемой.
 * Без карточки, рамки и тени: отделяется отступом и тонкой линией сверху.
 * Над заголовком может стоять микро-схема, под ней — место под фото.
 */
export default function AdvantageItem({ title, diagram, photo, children }) {
  return (
    <li className="border-t border-muted-on-dark pt-6">
      {diagram && <div className="mb-5">{diagram}</div>}
      {photo && <div className="mb-5">{photo}</div>}
      <h3 className="text-title">{title}</h3>
      <p className="mt-3 max-w-measure text-body">{children}</p>
    </li>
  )
}
