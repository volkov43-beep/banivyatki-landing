import ResponsivePhoto from '../ResponsivePhoto.jsx'
import Button from '../Button.jsx'
import { formatWorkPrice } from '../../data/works.js'

/**
 * Карточка объекта: главное фото 4:3 (кнопка — открывает увеличение),
 * под ним подпись из трёх частей: строка объекта (text-body, ink),
 * комплектация через запятую (15 px, muted), цена отдельной строкой
 * (text-title, accent — главное в подписи); ниже ссылка-кнопка
 * «Рассчитать такую» (Button variant="link"). У объекта без `equipment`,
 * `price` и `calc` («Доставка и установка») — только строка объекта.
 */
export default function WorkCard({ work, onOpen, onCalc }) {
  const [photo] = work.photos
  return (
    <li className="m-0 p-0">
      <button
        type="button"
        onClick={() => onOpen(work)}
        aria-label={`Увеличить фото: ${work.caption}`}
        className="block w-full cursor-zoom-in rounded-md p-0"
      >
        <ResponsivePhoto name={photo.name} alt={photo.alt} sizes="(min-width: 1024px) 368px, 50vw" />
      </button>
      <p className="mt-3 text-body text-ink">{work.caption}</p>
      {work.equipment && (
        <p className="mt-1 text-[15px] leading-[1.45] text-muted">{work.equipment.join(', ')}</p>
      )}
      {work.price != null && <p className="mt-2 text-title text-accent">{formatWorkPrice(work.price)}</p>}
      {work.calc && (
        <Button variant="link" size="lg" onClick={() => onCalc(work)} className="mt-2">
          Рассчитать такую
        </Button>
      )}
    </li>
  )
}
