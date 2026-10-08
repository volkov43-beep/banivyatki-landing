import { useCallback, useState } from 'react'
import { CATALOG_MODELS, CATALOG_TITLE, CATALOG_SUBTITLE } from '../../data/catalog.js'
import { track } from '../../lib/track.js'
import CatalogCard from './CatalogCard.jsx'
import CatalogDialog from './CatalogDialog.jsx'
import CatalogPlan from './CatalogPlan.jsx'
import CatalogForm from './CatalogForm.jsx'

export default function CatalogSection() {
  const [open, setOpen] = useState(null)
  const close = useCallback(() => setOpen(null), [])

  function showPlan(model) {
    track('catalog_plan_open', { model: model.crmCode })
    setOpen({ kind: 'plan', model })
  }

  function showCatalog(model) {
    track('catalog_open', { model: model.crmCode })
    setOpen({ kind: 'form', model })
  }

  return (
    <section id="catalog" aria-labelledby="catalog-title" className="bg-forest py-section-y text-surface md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="catalog-title" className="text-center text-heading">{CATALOG_TITLE}</h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{CATALOG_SUBTITLE}</p>
        <ul className="mt-12 grid list-none grid-cols-1 gap-x-4 gap-y-8 p-0 min-[600px]:grid-cols-2 md:mt-16 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-10">
          {CATALOG_MODELS.map((model) => <CatalogCard key={model.id} model={model} onPlan={showPlan} onCatalog={showCatalog} />)}
        </ul>
      </div>
      {open && (
        <CatalogDialog kind={open.kind} title={open.kind === 'plan' ? `Планировка — ${open.model.title}` : 'Получить каталог'} onClose={close}>
          {open.kind === 'plan'
            ? <CatalogPlan model={open.model} onCatalog={showCatalog} />
            : <CatalogForm key={open.model.id} model={open.model} />}
        </CatalogDialog>
      )}
    </section>
  )
}
