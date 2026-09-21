/**
 * Переключатель из нескольких кнопок. Радиогруппа: один активный вариант.
 * Без анимаций.
 */
export default function Segmented({ label, options, value, onChange, full = false, size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-2 text-[15px]' : 'px-4 py-2.5 text-body'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex max-w-full flex-wrap rounded-md border border-muted p-1 ${full ? 'w-full' : ''}`}
    >
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`min-w-0 flex-1 whitespace-normal rounded ${pad} font-bold leading-tight ${
              active ? 'bg-ink text-surface' : 'bg-transparent text-ink'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
