/**
 * Первый экран. Одно действие — кнопка «Рассчитать стоимость».
 *
 * Компьютер (от 768 px): картинка на весь экран высотой 90vh (640…900 px;
 * на 768…1023 px — 72vh, иначе женщина и баня не влезают в кадр),
 * колонка текста справа от 58 % ширины, затемнение градиентом справа налево
 * и сверху под шапку. Положение кадра по ширине: 10 % на планшете, 20 % от 1024,
 * 30 % от 1280 — чтобы кресло не резалось левым краем.
 *
 * Телефон: картинка высотой 46vh, текст под ней на фоне ink. Затемнение внизу
 * кадра уходит в чёрный, а не в ink, поэтому нижние 22 % картинки сведены
 * с фоном коротким переходом в ink.
 */
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
    rest: 'на Авито — 40 отзывов',
    href: 'https://www.avito.ru/brands/36cc84c3d198c57e876595ba59d31c61',
  },
]

export default function SectionHero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative bg-ink text-surface">
      {/* Картинка */}
      <div className="relative h-[46vh] min-h-[300px] md:h-[clamp(560px,72vh,900px)] lg:h-[clamp(640px,90vh,900px)]">
        <picture>
          <source media="(max-width: 767px)" srcSet={PHOTO.mobile} />
          <source
            media="(min-width: 768px)"
            srcSet={`${PHOTO.w1280} 1280w, ${PHOTO.w1920} 1920w`}
            sizes="100vw"
          />
          <img
            src={PHOTO.w1920}
            width="1920"
            height="1071"
            alt="Баня-подкова под навесом на участке, рядом в кресле отдыхает женщина"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover object-[center_40%] md:object-[10%_center] lg:object-[20%_center] xl:object-[30%_center]"
          />
        </picture>

        {/* Затемнение справа налево — только на компьютере */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(to right, rgb(26 21 18 / 0) 44%, rgb(26 21 18 / 0.9) 58%, rgb(26 21 18 / 0.92) 100%)',
          }}
        />
        {/* Затемнение сверху под шапку */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[170px]"
          style={{
            background:
              'linear-gradient(to bottom, rgb(26 21 18 / 0.8) 0, rgb(26 21 18 / 0.7) 60px, rgb(26 21 18 / 0) 170px)',
          }}
        />
        {/* Переход низа картинки в ink — только на телефоне */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[22%] md:hidden"
          style={{ background: 'linear-gradient(to bottom, rgb(26 21 18 / 0), rgb(26 21 18 / 1))' }}
        />
      </div>

      {/* Колонка текста: на телефоне под картинкой, на компьютере поверх неё справа */}
      <div className="px-5 pb-12 pt-6 md:absolute md:inset-y-0 md:left-[58%] md:right-0 md:flex md:items-center md:p-0 md:pr-gutter-lg">
        <div className="md:max-w-[560px] md:pb-[6vh]">
          <h1
            id="hero-title"
            className="text-[clamp(30px,8vw,38px)] font-bold leading-[1.05] md:text-[clamp(40px,3.7vw,54px)]"
          >
            Баня‑подкова: шире бочки, с&nbsp;ровным полом, под&nbsp;ключ
          </h1>

          <p className="mt-5 text-[20px] leading-[1.4] opacity-[0.85]">
            Привозим готовой и устанавливаем за 1 день.
          </p>

          <p className="mt-8 whitespace-nowrap leading-none">
            <span className="text-[32px] font-bold text-accent">от 293&nbsp;000&nbsp;₽</span>{' '}
            <span className="text-[20px]">под ключ</span>
          </p>

          <a
            href="#calculator"
            className="mt-8 inline-flex h-14 w-full items-center justify-center rounded px-8 text-body font-bold text-ink no-underline md:w-auto"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Рассчитать стоимость
          </a>

          <ul className="mt-10 flex list-none flex-wrap gap-x-7 gap-y-2 p-0 text-[15px] leading-[1.3]">
            {FACTS.map((fact) => {
              const inner = (
                <>
                  <b className="font-bold">{fact.strong}</b>{' '}
                  <span className="opacity-75">{fact.rest}</span>
                </>
              )
              return (
                <li key={fact.strong}>
                  {fact.href ? (
                    <a href={fact.href} target="_blank" rel="noopener noreferrer" className="text-surface no-underline">
                      {inner}
                    </a>
                  ) : (
                    inner
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
