import { PHONE } from '../data/calculator.js'
import { track } from '../lib/track.js'

const BASE = import.meta.env.BASE_URL
const VK_URL = 'https://vk.ru/banivyatki_ru'

/** Ссылка в подвале: светлая, при наведении accent. */
const linkClass = 'text-surface no-underline transition-colors duration-150 hover:text-accent'

/**
 * Подвал на ink, текст muted-on-dark, ссылки surface → accent при наведении.
 * От 1024 px три колонки: логотип 64 px и строка о компании в одну строку /
 * телефон крупно и часы / адрес и ВКонтакте. До 1023 px одна колонка по
 * центру в том же порядке; логотип и текст остаются в строку, а если текст
 * не помещается рядом — переносится под логотип. Внизу над тонкой линией — копирайт, оператор, ИНН, политика.
 *
 * Без почты, счёта, юридического адреса, адреса производства, карты,
 * кнопок и форм. Клик по телефону — общая цель phone_click (слушатель
 * в main.jsx), по ВКонтакте — vk_click.
 */
export default function Footer() {
  return (
    <footer className="bg-ink py-12 text-[15px] leading-normal text-muted-on-dark md:py-16">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <div className="grid gap-10 text-center lg:grid-cols-3 lg:gap-12 lg:text-left">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 lg:justify-start">
            <a href="#top" className="block shrink-0 no-underline" aria-label="Бани Вятки, в начало страницы">
              <img
                src={`${BASE}photos/logo-128.webp`}
                srcSet={`${BASE}photos/logo-128.webp 128w, ${BASE}photos/logo-256.webp 256w`}
                sizes="64px"
                width="64"
                height="64"
                alt="Бани Вятки"
                loading="lazy"
                decoding="async"
                className="block h-16 w-16 rounded-full"
              />
            </a>
            <p className="max-w-[240px] grow basis-[180px] text-left">Бани собственного производства, с 2012 года</p>
          </div>

          <div>
            <a href={`tel:${PHONE.tel}`} className={`${linkClass} text-[24px] font-bold leading-tight`}>
              {PHONE.display}
            </a>
            <p className="mt-2">Пн–Пт 9:00–17:00</p>
          </div>

          <div>
            <p>Киров, ул. Ленина, 71Б</p>
            <p className="mt-2">
              <a
                href={VK_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('vk_click')}
                className={`${linkClass} underline underline-offset-4`}
              >
                ВКонтакте
              </a>
            </p>
          </div>
        </div>

        <p className="mt-12 border-t border-[rgba(154,163,150,0.3)] pt-6 text-center text-label md:mt-16">
          © 2026 Бани Вятки · ООО «Банная философия», ИНН 9718285920 ·{' '}
          <a href={`${BASE}privacy/`} className={`${linkClass} underline underline-offset-4`}>
            Политика конфиденциальности
          </a>
        </p>
      </div>
    </footer>
  )
}
