/**
 * Один из четырёх блоков под схемой.
 * Без карточки, рамки и тени: отделяется отступом и тонкой линией сверху.
 * Порядок: заголовок → полосы «бочка / Подкова» → схема → текст → фото с подписью.
 * Текст — строка (один абзац) или готовые <p> (несколько абзацев).
 */
export default function AdvantageItem({ title, strips, diagram, photo, children }) {
  return (
    <li className="border-t border-muted-on-dark pt-6">
      <h3 className="text-title">{title}</h3>
      {strips && <div className="mt-4">{strips}</div>}
      {diagram && <div className="mt-5">{diagram}</div>}
      {typeof children === 'string' ? (
        <p className="mt-4 max-w-measure text-body">{children}</p>
      ) : (
        <div className="mt-4 max-w-measure text-body [&>p+p]:mt-3">{children}</div>
      )}
      {photo && <div className="mt-5">{photo}</div>}
    </li>
  )
}
