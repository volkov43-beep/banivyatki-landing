import Button from '../Button.jsx'
import { photoSrc } from '../ResponsivePhoto.jsx'

export default function CatalogPlan({ model, onCatalog }) {
  return (
    <>
      <img
        src={photoSrc(model.planImage, 1280)}
        srcSet={`${photoSrc(model.planImage, 640)} 640w, ${photoSrc(model.planImage, 1280)} 1280w`}
        sizes="(min-width: 960px) 896px, calc(100vw - 72px)"
        alt={model.planAlt}
        width="1280"
        height="956"
        decoding="async"
        className="mx-auto block h-auto max-h-[65dvh] w-auto max-w-full rounded-md object-contain"
      />
      <Button full className="mt-6 whitespace-nowrap" onClick={() => onCatalog(model)}>
        Получить каталог
      </Button>
    </>
  )
}
