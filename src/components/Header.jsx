/**
 * Шапка: название и телефон. Лежит поверх первого экрана.
 */
export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 text-surface">
      <div className="mx-auto flex max-w-container items-center justify-between gap-6 px-gutter py-5 md:px-gutter-lg">
        <a href="#top" className="text-[20px] font-bold leading-none no-underline">
          Бани Вятки
        </a>
        <a href="tel:+78332775770" className="text-[20px] font-bold leading-none no-underline">
          +7 (8332) 77-57-70
        </a>
      </div>
    </header>
  )
}
