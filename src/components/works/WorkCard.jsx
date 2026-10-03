import { useId, useState } from 'react'
import ResponsivePhoto from '../ResponsivePhoto.jsx'
import Button from '../Button.jsx'
import { EQUIPMENT_VISIBLE, formatWorkPrice } from '../../data/works.js'

/**
 * Карточка объекта: главное фото 4:3 (кнопка — открывает увеличение),
 * под ним подпись из трёх частей: строка объекта (text-body, ink),
 * комплектация через запятую (15 px, muted), цена отдельной строкой
 * (text-title, price — тёмно-зелёный для светлого фона); ниже ссылка-кнопка
 * «Рассчитать такую» (Button variant="link"). У объекта без `equipment`,
 * `price` и `calc` («Доставка и установка») — только строка объекта.
 *
 * Комплектация: видны первые EQUIPMENT_VISIBLE пунктов, остальные за
 * ссылкой-кнопкой «+ ещё N» (link sm); клик раскрывает их в той же карточке,
 * повторный («Свернуть») прячет. Без анимации — меняется только высота.
 *
 * Карточка — flex-колонка: в ряду сетки все одной высоты, цена и кнопка
 * прижаты к низу (mt-auto), фото и подписи — сверху.
 */
export default function WorkCard({ work, onOpen, onCalc }) {
  const [photo] = work.photos
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const equipment = work.equipment || []
  const hidden = Math.max(0, equipment.length - EQUIPMENT_VISIBLE)
  const shown = expanded || hidden === 0 ? equipment : equipment.slice(0, EQUIPMENT_VISIBLE)
  const hasBottom = work.price != null || work.calc

  return (
    <li className="m-0 flex flex-col p-0">
      <button
        type="button"
        onClick={() => onOpen(work)}
        aria-label={`Увеличить фото: ${work.caption}`}
        className="block w-full cursor-zoom-in rounded-md p-0"
      >
        <ResponsivePhoto
          name={photo.name}
          alt={photo.alt}
          sizes="(min-width: 1024px) 368px, (min-width: 600px) 50vw, 100vw"
        />
      </button>
      <p className="mt-3 text-body text-ink">{work.caption}</p>
      {equipment.length > 0 && (
        <p id={listId} className="mt-1 text-[15px] leading-[1.45] text-muted">
          {shown.join(', ')}
        </p>
      )}
      {hidden > 0 && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={listId}
          className="mt-1 self-start"
        >
          {expanded ? 'Свернуть' : `+ ещё ${hidden}`}
        </Button>
      )}
      {hasBottom && (
        <div className="mt-auto pt-2">
          {work.price != null && <p className="text-title text-price">{formatWorkPrice(work.price)}</p>}
          {work.calc && (
            <Button variant="link" size="lg" onClick={() => onCalc(work)} className="mt-2 self-start">
              Рассчитать такую
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
