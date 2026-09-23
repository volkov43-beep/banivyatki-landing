/**
 * Переключатель из равных половинок. Радиогруппа: один активный вариант.
 * Сетка 1fr на каждый вариант, поэтому ширина половинок не зависит от текста
 * и при переключении меняются только фон и цвет, без изменения размеров.
 *
 * size 'md' — вкладки и сезон, на всю ширину;
 * size 'sm' — «Звонок / MAX»: ширина 240 px (на телефоне 100 %), высота 44 px,
 * отступ контейнера 4 px, текст 15 px, у выбранного вес 700, у остальных 400;
 * с full — на всю ширину и на компьютере;
 * size 'xs' — как 'sm', но до 600 px текст 13 px (до 400 px — 12 px) и отступы 2 px: для трёх
 * вариантов в ряд на телефоне («Шоурум / Производство / Видеозвонок»).
 * scheme 'light' — на светлом фоне (рамка muted, выбранный ink);
 * scheme 'dark' — на ink / forest (рамка muted-on-dark, выбранный surface);
 * scheme 'accent' — на светлой карточке (рамка muted, выбранный accent
 *   с текстом ink, невыбранный прозрачный с текстом ink) — карточка вопроса FAQ.
 */
export default function Segmented({ label, options, value, onChange, full = false, size = 'md', scheme = 'light' }) {
  const small = size === 'sm' || size === 'xs'
  const tiny = size === 'xs'
  const dark = scheme === 'dark'
  const accent = scheme === 'accent'
  const box = small
    ? full
      ? 'h-11 w-full'
      : 'h-11 w-full lg:w-[240px]'
    : full
      ? 'w-full'
      : 'w-auto'
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`grid rounded-md border p-1 ${dark ? 'border-muted-on-dark' : 'border-muted'} ${box}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
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
            className={`flex items-center justify-center rounded-[2px] text-center leading-tight transition-colors duration-150 ${
              tiny ? 'h-full px-0.5 text-[12px] min-[400px]:text-[13px] min-[600px]:px-2 min-[600px]:text-[15px]' : small ? 'h-full px-2 text-[15px]' : 'px-4 py-2.5 text-body font-bold'
            } ${active ? (dark ? 'bg-surface text-ink' : accent ? 'bg-accent text-ink' : 'bg-ink text-surface') : dark ? 'bg-transparent text-surface' : 'bg-transparent text-ink'} ${
              small ? (active ? 'font-bold' : 'font-normal') : ''
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
