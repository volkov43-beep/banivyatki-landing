import { photoSrc } from '../ResponsivePhoto.jsx'

export default function CatalogPlan({ model }) {
  return (
    <>
      <img
        src={photoSrc(model.planImage, 1280)}
        srcSet={`${photoSrc(model.planImage, 640)} 640w, ${photoSrc(model.planImage, 1280)} 1280w`}
        sizes="(min-width: 960px) 912px, (min-width: 768px) calc(100vw - 80px), calc(100vw - 64px)"
        alt={model.planAlt}
        width="1280"
        height="956"
        decoding="async"
        className="mx-auto block h-auto max-h-[65dvh] w-auto max-w-full rounded-md object-contain"
      />
    </>
  )
}
