/**
 * Первый экран. Одно действие — кнопка «Рассчитать стоимость».
 *
 * Компьютер (от 1024 px): картинка на весь экран высотой 90vh (640…900 px),
 * колонка текста справа от 58 % ширины. Затемнение: плавный градиент справа
 * налево с множеством остановок (левая часть с баней и женщиной не темнеет),
 * мягкий радиальный ореол за колонкой текста. Затемнения сверху под шапкой нет.
 * Положение кадра по ширине: 20 % от 1024, 30 % от 1280 — чтобы кресло
 * не резалось левым краем. Тексту дана мягкая тень без чёткого края.
 *
 * Телефон и планшет (до 1023 px): картинка высотой 46vh, текст под ней на фоне ink. Затемнение внизу
 * кадра уходит в чёрный, а не в ink, поэтому нижние 22 % картинки сведены
 * с фоном коротким переходом в ink.
 */
import { MIN_PRICE, formatPrice } from '../data/calculator.js'

const BASE = import.meta.env.BASE_URL
const PHOTO = {
  w1920: `${BASE}photos/hero-autumn-1920.webp`,
  w1280: `${BASE}photos/hero-autumn-1280.webp`,
  mobile: `${BASE}photos/hero-autumn-mobile-1080.webp`,
}

const FACTS = [
  { strong: '1000+', rest: 'бань с 2012 года' },
  { strong: 'Гарантия', rest: '5 лет' },
  {
    strong: '5,0',
    rest: 'на Авито — 25 отзывов о банях',
    href: 'https://www.avito.ru/brands/36cc84c3d198c57e876595ba59d31c61',
  },
]

export default function SectionHero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative bg-ink text-surface">
      {/* Картинка */}
      <div className="relative h-[46vh] min-h-[300px] lg:h-[clamp(640px,90vh,900px)]">
        <picture>
          <source media="(max-width: 1023px)" srcSet={PHOTO.mobile} />
          <source
            media="(min-width: 1024px)"
            srcSet={`${PHOTO.w1280} 1280w, ${PHOTO.w1920} 1920w`}
            sizes="100vw"
          />
          <img
            src={PHOTO.w1920}
            width="1920"
            height="1071"
            alt="Баня-Подкова под навесом на участке, рядом в кресле отдыхает женщина"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[center_40%] lg:object-[20%_center] xl:object-[30%_center]"
          />
        </picture>

        {/* Затемнение справа налево — только на компьютере, плавное, без видимой границы */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              'linear-gradient(to left, rgba(20,14,10,0.62) 0%, rgba(20,14,10,0.58) 12%, rgba(20,14,10,0.50) 22%, rgba(20,14,10,0.38) 32%, rgba(20,14,10,0.24) 41%, rgba(20,14,10,0.12) 49%, rgba(20,14,10,0.04) 56%, rgba(20,14,10,0) 62%)',
          }}
        />
        {/* Мягкий ореол за колонкой текста: читаемость там, где текст, не гася остальное небо.
            Сила подобрана по замеру контраста AA на 1440 и 1024 — это минимум, при котором
            проходят и заголовок, и цена цветом accent, и факты 15 px. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-[44%] right-0 hidden lg:block"
          style={{
            background:
              'radial-gradient(ellipse 60% 78% at 64% 45%, rgba(20,14,10,0.82) 0%, rgba(20,14,10,0.76) 50%, rgba(20,14,10,0.54) 72%, rgba(20,14,10,0.18) 88%, rgba(20,14,10,0) 100%)',
          }}
        />
        {/* Переход низа картинки в ink — только на телефоне */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[22%] lg:hidden"
          style={{ background: 'linear-gradient(to bottom, rgb(26 21 18 / 0), rgb(26 21 18 / 1))' }}
        />
      </div>

      {/* Колонка текста: на телефоне под картинкой, на компьютере поверх неё справа */}
      <div className="px-5 pb-12 pt-6 lg:absolute lg:inset-y-0 lg:left-[58%] lg:right-0 lg:flex lg:items-center lg:p-0 lg:pr-gutter-lg lg:[text-shadow:0_1px_24px_rgba(0,0,0,0.35)]">
        <div className="lg:max-w-[560px] lg:pb-[6vh]">
          <h1
            id="hero-title"
            className="text-[clamp(30px,8vw,38px)] font-bold leading-[1.05] lg:text-[clamp(40px,3.38vw,49px)]"
          >
            <span className="block">Баня‑Подкова:</span>
            <span className="block text-balance">шире бочки, с&nbsp;ровным полом, под&nbsp;ключ</span>
          </h1>

          <p className="mt-5 text-[20px] leading-[1.4] opacity-[0.85]">
            Привозим готовой и устанавливаем за 1 день.
          </p>

          <p className="mt-8 whitespace-nowrap leading-none">
            <span className="text-[32px] font-bold text-accent">{formatPrice(MIN_PRICE)}</span>{' '}
            <span className="text-[20px]">под ключ</span>
          </p>

          <a
            href="#calculator"
            className="mt-8 inline-flex h-14 w-full items-center justify-center rounded px-8 text-body font-bold text-ink no-underline lg:w-auto"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Рассчитать стоимость
          </a>

          <ul className="mt-10 flex list-none flex-wrap gap-x-7 gap-y-2 p-0 text-[15px] leading-[1.3] lg:flex-col lg:gap-2 lg:text-[16px]">
            {FACTS.map((fact) => {
              const inner = (
                <>
                  <b className="font-bold">{fact.strong}</b>{' '}
                  <span className="opacity-75">{fact.rest}</span>
                </>
              )
              return (
                /* Точка и пункт не разрываются переносом: перенос идёт целым пунктом */
                <li key={fact.strong} className="flex items-start whitespace-nowrap">
                  <span aria-hidden="true" className="mr-3 mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {fact.href ? (
                    <a href={fact.href} target="_blank" rel="noopener noreferrer" className="text-surface no-underline">
                      {inner}
                    </a>
                  ) : (
                    <span>{inner}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
