/**
 * Шапка: логотип и телефон. Лежит поверх первого экрана.
 * Логотип — круг 64 px на компьютере и 48 px на телефоне, файлы 128 и 256 px
 * через srcset для чётких экранов.
 */
const BASE = import.meta.env.BASE_URL

export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 text-surface">
      <div className="mx-auto flex max-w-container items-center justify-between gap-6 px-gutter py-4 md:px-gutter-lg">
        <a href="#top" className="block shrink-0 no-underline" aria-label="Бани Вятки, в начало страницы">
          <img
            src={`${BASE}photos/logo-128.webp`}
            srcSet={`${BASE}photos/logo-128.webp 128w, ${BASE}photos/logo-256.webp 256w`}
            sizes="(min-width: 1024px) 64px, 48px"
            width="64"
            height="64"
            alt="Бани Вятки"
            decoding="async"
            className="block h-12 w-12 rounded-full lg:h-16 lg:w-16"
          />
        </a>
        <a
          href="tel:+78332775770"
          className="text-[20px] font-bold leading-none no-underline"
        >
          +7 (8332) 77-57-70
        </a>
      </div>
    </header>
  )
}
