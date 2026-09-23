import ResponsivePhoto from '../ResponsivePhoto.jsx'

/**
 * Карточка объекта: главное фото 4:3 (кнопка — открывает увеличение),
 * подпись обычным текстом цветом ink, текстовая кнопка «Рассчитать такую»
 * цветом accent. У объекта без `calc` кнопки нет.
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
        <button
          type="button"
          onClick={() => onCalc(work)}
          className="mt-2 inline-block p-0 text-left text-body font-bold text-accent underline-offset-4 hover:underline"
        >
          Рассчитать такую
        </button>
      )}
    </li>
  )
}
