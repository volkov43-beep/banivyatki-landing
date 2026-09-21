/**
 * Шапка: логотип и телефон. Лежит поверх первого экрана на всю ширину окна,
 * не привязана к контейнеру: отступы 32 px на компьютере, 16 px на телефоне.
 *
 * Логотип — круг 64 px (48 px до 1023 px), файлы 128 и 256 px через srcset,
 * мягкая тень, чтобы отделяться от светлого неба.
 * Телефон: от 1024 px обычный текст; до 1023 px — ссылка-плашка
 * с иконкой трубки на полупрозрачном тёмном фоне с размытием.
 */
const BASE = import.meta.env.BASE_URL

function PhoneIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0 lg:hidden"
    >
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
    </svg>
  )
}

export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-6 px-4 py-4 text-surface lg:px-8">
      <a href="#top" className="block shrink-0 no-underline" aria-label="Бани Вятки, в начало страницы">
        <img
          src={`${BASE}photos/logo-128.webp`}
          srcSet={`${BASE}photos/logo-128.webp 128w, ${BASE}photos/logo-256.webp 256w`}
          sizes="(min-width: 1024px) 64px, 48px"
          width="64"
          height="64"
          alt="Бани Вятки"
          decoding="async"
          className="block h-12 w-12 rounded-full drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] lg:h-16 lg:w-16"
        />
      </a>
      <a
        href="tel:+78332775770"
        className="flex h-11 items-center gap-2 rounded-[22px] bg-[rgba(20,14,10,0.55)] px-[14px] text-[14px] font-bold leading-none text-white no-underline backdrop-blur-[8px] lg:h-auto lg:gap-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:text-[20px] lg:text-surface lg:backdrop-blur-none"
      >
        <PhoneIcon />
        <span>+7 (8332) 77-57-70</span>
      </a>
    </header>
  )
}
