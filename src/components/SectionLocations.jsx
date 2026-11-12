import MapBlock from './works/MapBlock.jsx'

export default function SectionLocations({ settings }) {
  return (
    <section aria-label={settings?.title ?? 'Где стоят наши бани'} className="bg-ink text-surface">
      <div className="mx-auto max-w-container px-gutter py-section-y md:px-gutter-lg md:py-section-y-lg">
        <MapBlock settings={settings} />
      </div>
    </section>
  )
}
