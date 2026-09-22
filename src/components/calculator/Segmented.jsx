/**
 * Переключатель из равных половинок. Радиогруппа: один активный вариант.
 * Сетка 1fr на каждый вариант, поэтому ширина половинок не зависит от текста
 * и при переключении меняются только фон и цвет, без изменения размеров.
 *
 * size 'md' — вкладки и сезон, на всю ширину;
 * size 'sm' — «Звонок / MAX»: ширина 240 px (на телефоне 100 %), высота 44 px,
 * отступ контейнера 4 px, текст 15 px, у выбранного вес 700, у остальных 400;
 * с full — на всю ширину и на компьютере.
 * scheme 'light' — на светлом фоне (рамка muted, выбранный ink);
 * scheme 'dark' — на ink / forest (рамка muted-on-dark, выбранный surface).
 */
export default function Segmented({ label, options, value, onChange, full = false, size = 'md', scheme = 'light' }) {
  const small = size === 'sm'
  const dark = scheme === 'dark'
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
              small ? 'h-full px-2 text-[15px]' : 'px-4 py-2.5 text-body font-bold'
            } ${active ? (dark ? 'bg-surface text-ink' : 'bg-ink text-surface') : dark ? 'bg-transparent text-surface' : 'bg-transparent text-ink'} ${
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
