import ResponsivePhoto from '../ResponsivePhoto.jsx'
import Button from '../Button.jsx'

/**
 * Карточка объекта: главное фото 4:3 (кнопка — открывает увеличение),
 * подпись обычным текстом цветом ink, ссылка-кнопка «Рассчитать такую»
 * (Button variant="link"). У объекта без `calc` кнопки нет.
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
      {work.calc && (
        <Button variant="link" size="lg" onClick={() => onCalc(work)} className="mt-2">
          Рассчитать такую
        </Button>
      )}
    </li>
  )
}
