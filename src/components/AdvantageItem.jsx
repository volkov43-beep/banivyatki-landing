/**
 * Один из четырёх блоков под схемой.
 * Без карточки, рамки и тени: отделяется отступом и тонкой линией сверху.
 * Порядок: заголовок → микро-схема → текст → фото с подписью.
 */
export default function AdvantageItem({ title, diagram, photo, children }) {
  return (
    <li className="border-t border-muted-on-dark pt-6">
      <h3 className="text-title">{title}</h3>
      {diagram && <div className="mt-5">{diagram}</div>}
      <p className="mt-4 max-w-measure text-body">{children}</p>
      {photo && <div className="mt-5">{photo}</div>}
    </li>
  )
}
