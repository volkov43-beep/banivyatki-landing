import MapBlock from './works/MapBlock.jsx'

// Existing map and its spacing, data, loader and analytics are unchanged.
export default function SectionLocations() {
  return (
    <section aria-label="Где стоят наши бани" className="bg-ink text-surface">
      <div className="mx-auto max-w-container px-gutter py-section-y md:px-gutter-lg md:py-section-y-lg">
        <MapBlock />
      </div>
    </section>
  )
}
