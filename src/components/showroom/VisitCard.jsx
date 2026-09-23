import ResponsivePhoto from '../ResponsivePhoto.jsx'
import Button from '../Button.jsx'

/**
 * Карточка одного способа посмотреть баню. Подложка surface-2, скругление 6 px.
 *
 * От 1024 px: фото и текст в две равные колонки (reverse — текст слева,
 * фото справа), ниже на всю ширину лента фото в ряд. До 1023 px: фото →
 * текст → лента в две колонки; элемент ленты с `wide` занимает обе.
 * Подписи ленты мелкие, muted; в `numbered` перед подписью номер шага accent.
 * `compact` — карточка поменьше: фото на треть ширины, текст на две трети.
 *
 * onVisit(id) — клик по кнопке: блок прокручивает к форме записи и выбирает
 * в ней нужный способ.
 */
export default function VisitCard({ card, reverse = false, numbered = false, compact = false, onVisit }) {
  const cols = card.gallery?.length || 0
  const rowClass = { 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }[cols] || 'lg:grid-cols-4'

  return (
    <article className="rounded-md bg-surface-2 p-5 md:p-8 lg:p-10" aria-labelledby={`visit-${card.id}-title`}>
      <div className={`grid gap-8 lg:items-center lg:gap-12 ${compact ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        <div className={reverse ? 'lg:order-2' : ''}>
          <ResponsivePhoto name={card.photo.name} alt={card.photo.alt} sizes={compact ? '(min-width: 1024px) 340px, 100vw' : '(min-width: 1024px) 520px, 100vw'} />
        </div>
        <div className={`${reverse ? 'lg:order-1' : ''} ${compact ? 'lg:col-span-2' : ''}`}>
          <h3 id={`visit-${card.id}-title`} className="text-[22px] font-bold leading-[1.2]">
            {card.title}
          </h3>
          {card.address && <p className="mt-2 text-body font-bold text-accent">{card.address}</p>}
          <p className="mt-4 max-w-measure text-body">{card.text}</p>
          <Button onClick={onVisit ? () => onVisit(card.id) : undefined} arrow fullMobile className="mt-6">
            {card.button}
          </Button>
        </div>
      </div>

      {cols > 0 && (
        <div className="mt-8 lg:mt-10">
          {card.galleryTitle && <p className="mb-4 text-label text-muted">{card.galleryTitle}</p>}
          <ul className={`m-0 grid list-none grid-cols-2 gap-x-4 gap-y-5 p-0 ${rowClass} lg:gap-6`}>
            {card.gallery.map((item, i) => (
              <li key={item.name} className={item.wide ? 'col-span-2 lg:col-span-1' : ''}>
                <figure className="m-0">
                  <ResponsivePhoto
                    name={item.name}
                    alt={item.alt}
                    sizes={`(min-width: 1024px) ${Math.round(1120 / cols)}px, ${item.wide ? '100vw' : '50vw'}`}
                  />
                  <figcaption className="mt-2 text-label leading-[1.3] text-muted">
                    {numbered && <span className="font-bold text-accent">{i + 1}. </span>}
                    {item.caption}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
