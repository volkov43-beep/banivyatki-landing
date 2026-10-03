import ResponsivePhoto from '../ResponsivePhoto.jsx'
import Button from '../Button.jsx'
import { formatPrice } from '../../data/calculator.js'
import { projectPrice } from '../../data/projects.js'

const BASE = import.meta.env.BASE_URL

/**
 * Карточка проекта: фото 4:3 со скруглением, название (text-title, ink),
 * состав (15 px, muted), цена «от» (text-title, цвет price — как в «Наших
 * работах»), кнопка «Рассчитать» (secondary md). Карточка — flex-колонка:
 * в ряду все одной высоты, цена и кнопка прижаты к низу.
 *
 * Фото: { name } — две ширины через ResponsivePhoto; { src, width, height } —
 * один файл из фотобанка тем же <img> (lazy, явные размеры, 4:3).
 */
export default function ProjectCard({ project, onCalc }) {
  const { photo } = project
  const sizes = '(min-width: 1024px) 368px, 50vw'
  return (
    <li className="m-0 flex flex-col p-0">
      {photo.name ? (
        <ResponsivePhoto name={photo.name} alt={photo.alt} sizes={sizes} />
      ) : (
        <img
          src={`${BASE}${photo.src}`}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full rounded-md object-cover"
          style={{ aspectRatio: '4 / 3' }}
        />
      )}
      <h3 className="mt-3 text-title text-ink">{project.name}</h3>
      <p className="mt-1 text-[15px] leading-[1.45] text-muted">{project.inside}</p>
      <div className="mt-auto pt-3">
        <p className="text-title text-price">{formatPrice(projectPrice(project))}</p>
        <Button variant="secondary" scheme="light" size="md" fullMobile onClick={() => onCalc(project)} className="mt-3">
          Рассчитать
        </Button>
      </div>
    </li>
  )
}
