import Button from '../Button.jsx'
import ResponsivePhoto, { photoSrc } from '../ResponsivePhoto.jsx'
import { CATALOG_IMAGE_RATIO, CATALOG_IMAGE_SIZES } from '../../data/catalog.js'

export default function CatalogCard({ model, onPlan, onCatalog }) {
  return (
    <li className="m-0 flex min-w-0 flex-col p-0">
      <ResponsivePhoto name={model.catalogImage} alt={model.alt} ratio={CATALOG_IMAGE_RATIO} sizes={CATALOG_IMAGE_SIZES} />
      <h3 className="mt-4 text-title">{model.title}</h3>
      <p className="mt-2 text-body">{model.tagline}</p>
      <div className="mt-auto pt-4">
        <p className="text-[15px] leading-[1.45] text-muted-on-dark">
          {model.dimensions} · {model.sections}
          <br />
          {model.capacity}
        </p>
        {model.priceFrom != null && (
          <p className="mt-3 text-title text-accent">
            от {model.priceFrom.toLocaleString('ru-RU')} ₽
          </p>
        )}
        <Button variant="link" size="md" className="mt-3 min-h-11 cursor-pointer" onClick={() => onPlan(model)} aria-label={`Планировка — ${model.title}`}>
          <span className="flex flex-col items-start gap-2 text-left">
            <span>Планировка</span>
            <img
              src={photoSrc(model.planImage, 640)}
              alt=""
              width={640}
              height={478}
              loading="lazy"
              decoding="async"
              className="block h-[105px] w-[140px] rounded-md object-contain group-hover:opacity-90"
            />
          </span>
        </Button>
        <Button full className="mt-3 whitespace-nowrap" onClick={() => onCatalog(model)} aria-label={`Получить каталог — ${model.title}`}>
          Получить каталог
        </Button>
      </div>
    </li>
  )
}
