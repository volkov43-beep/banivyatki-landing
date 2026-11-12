export default function SectionDelivery({ delivery }) {
  return (
    <section id="delivery" aria-labelledby="delivery-title" className="bg-surface-2 py-section-y text-ink md:py-section-y-lg">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="delivery-title" className="mx-auto max-w-measure text-center text-heading">{delivery.title}</h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead">{delivery.subtitle}</p>
        <ol role="list" className="mt-10 grid list-none gap-6 p-0 md:grid-cols-2 md:gap-8 xl:grid-cols-4">
          {delivery.steps.map((step, index) => (
            <li key={step.title} className="border-t border-muted pt-4">
              <div className="flex items-baseline gap-3">
                <span aria-hidden="true" className="font-bold tabular-nums text-price">{index + 1}.</span>
                <h3 className="text-title">{step.title}</h3>
              </div>
              <p className="mt-3 max-w-measure text-body">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
