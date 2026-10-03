/**
 * Буквенная аватарка: круг 44 px, внутри первая буква имени (18 px, 600,
 * ink). Фото профилей с площадок не берём — люди не давали согласия.
 * Фон круга — один из трёх по порядковому номеру карточки, по кругу, чтобы
 * соседние не совпадали: surface-2, #E6D9C8, #DCE4D5 (карточки стоят на
 * surface, поэтому первый цвет — surface-2, а не surface: иначе круг
 * сливался бы с карточкой). aria-hidden: имя уже есть текстом рядом.
 */
const COLORS = ['var(--color-surface-2)', '#E6D9C8', '#DCE4D5']

export default function Avatar({ name, index }) {
  const letter = name.trim().charAt(0).toUpperCase()
  return (
    <span
      aria-hidden="true"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] font-semibold leading-none text-ink"
      style={{ backgroundColor: COLORS[index % COLORS.length] }}
    >
      {letter}
    </span>
  )
}
