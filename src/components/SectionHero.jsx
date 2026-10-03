/**
 * Первый экран. Одно действие — кнопка «Рассчитать стоимость».
 *
 * Компьютер (от 1024 px): картинка на весь экран высотой 90vh (640…900 px),
 * колонка текста слева, до 42 % ширины. Кадр отзеркален по горизонтали
 * (CSS `-scale-x-100`, файлы не тронуты): в исходнике баня и женщина слева
 * и смотрят вправо, под текстом они бы пропали; теперь они справа и смотрят
 * к тексту. Затемнение: плавный градиент слева направо с множеством остановок
 * (правая часть с баней и женщиной не темнеет), мягкий радиальный ореол за
 * колонкой текста. Колонка на компьютере начинается под логотипом шапки
 * (pt-20) и центрируется по высоте автоматическими полями (`my-auto`): на
 * низких экранах (1280 × 720) текст не уезжает под логотип, а прижимается
 * к верху колонки. Затемнения сверху под шапкой нет. Положение кадра по
 * ширине: 20 % от 1024, 30 % от 1280 (считается до зеркала) — чтобы кресло
 * не резалось краем. Тексту дана мягкая тень без чёткого края.
 *
 * Порядок в колонке: заголовок, подзаголовок, цена, факты, плашка рейтинга
 * Авито, кнопка — на всех ширинах (рядом с кнопкой плашка в колонку 557 px
 * на 1440 не помещается, поэтому над ней). Плашка
 * (данные SOURCES.avito из data/reviews.js): название площадки словами, оценка
 * крупно, звёзды контуром (RatingStars outline), число оценок мелко; без
 * ссылки и без логотипа. Факт «5,0 на Авито» из списка фактов ушёл в плашку.
 *
 * Телефон и планшет (до 1023 px): картинка высотой 46vh, текст под ней на фоне ink. Затемнение внизу
 * кадра уходит в чёрный, а не в ink, поэтому нижние 22 % картинки сведены
 * с фоном коротким переходом в ink.
 */
import { useEffect, useRef, useState } from 'react'
import { MIN_PRICE, formatPrice } from '../data/calculator.js'
import { SOURCES } from '../data/reviews.js'
import Button from './Button.jsx'
import RatingStars from './RatingStars.jsx'

const BASE = import.meta.env.BASE_URL
const PHOTO = {
  w1920: `${BASE}photos/hero-autumn-1920.webp`,
  w1280: `${BASE}photos/hero-autumn-1280.webp`,
  mobile: `${BASE}photos/hero-autumn-mobile-1080.webp`,
}

const FACTS = [
  { strong: '1000+', rest: 'бань с 2012 года' },
  { strong: 'Гарантия', rest: '5 лет' },
]

/** Плашка рейтинга Авито: не ссылка, никуда не ведёт. */
function RatingBadge({ source, className = '' }) {
  return (
    <div
      className={`inline-flex items-center gap-3 self-start rounded-md border border-[rgba(244,234,223,0.22)] bg-[rgba(20,14,10,0.35)] px-4 py-2.5 backdrop-blur-[6px] ${className}`}
    >
      <span className="text-[28px] font-bold leading-none">{source.rating}</span>
      <span className="flex flex-col gap-1.5">
        <span className="flex items-center gap-2 text-[15px] font-bold leading-none">
          {source.name}
          <RatingStars rating={source.rating} id={`hero-rating-${source.id}`} outline />
        </span>
        <span className="text-[13px] leading-none opacity-75">{source.count}</span>
      </span>
    </div>
  )
}

export default function SectionHero() {
  // «Дыхание» кнопки: один раз, когда она впервые попала в поле зрения;
  // не запускается, если до этого навели или нажали, и при reduced-motion.
  const ctaRef = useRef(null)
  const [breathe, setBreathe] = useState(false)
  const done = useRef(false)
  const cancelBreathe = () => {
    done.current = true
  }
  useEffect(() => {
    const el = ctaRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      if (done.current) return
      done.current = true
      setBreathe(true)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
            className="absolute inset-0 h-full w-full -scale-x-100 object-cover object-[center_40%] lg:object-[20%_center] xl:object-[30%_center]"
          />
        </picture>

        {/* Затемнение слева направо — только на компьютере, плавное, без видимой границы */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden lg:block"
          style={{
            background:
              'linear-gradient(to right, rgba(20,14,10,0.62) 0%, rgba(20,14,10,0.58) 12%, rgba(20,14,10,0.50) 22%, rgba(20,14,10,0.38) 32%, rgba(20,14,10,0.24) 41%, rgba(20,14,10,0.12) 49%, rgba(20,14,10,0.04) 56%, rgba(20,14,10,0) 62%)',
          }}
        />
        {/* Мягкий ореол за колонкой текста: читаемость там, где текст, не гася остальное небо.
            Сила подобрана по замеру контраста AA на 1440 и 1024 — это минимум, при котором
            проходят и заголовок, и цена цветом accent, и факты 15 px. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 right-[44%] hidden lg:block"
          style={{
            background:
              'radial-gradient(ellipse 60% 78% at 36% 45%, rgba(20,14,10,0.82) 0%, rgba(20,14,10,0.76) 50%, rgba(20,14,10,0.54) 72%, rgba(20,14,10,0.18) 88%, rgba(20,14,10,0) 100%)',
          }}
        />
        {/* Переход низа картинки в ink — только на телефоне */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[22%] lg:hidden"
          style={{ background: 'linear-gradient(to bottom, rgb(26 21 18 / 0), rgb(26 21 18 / 1))' }}
        />
      </div>

      {/* Колонка текста: на телефоне под картинкой, на компьютере поверх неё слева */}
      <div className="px-5 pb-12 pt-6 lg:absolute lg:inset-y-0 lg:left-0 lg:right-[58%] lg:flex lg:p-0 lg:pl-gutter-lg lg:pt-20 lg:[text-shadow:0_1px_24px_rgba(0,0,0,0.35)]">
        <div className="lg:my-auto lg:max-w-[560px] lg:pb-[4vh]">
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

          <p className="mt-8 whitespace-nowrap leading-none lg:mt-6">
            <span className="text-[32px] font-bold text-accent">{formatPrice(MIN_PRICE)}</span>{' '}
            <span className="text-[20px]">под ключ</span>
          </p>

          <ul className="mt-8 flex list-none flex-wrap gap-x-7 gap-y-2 p-0 text-[15px] leading-[1.3] lg:mt-6 lg:flex-col lg:gap-2 lg:text-[16px]">
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
                  <span>{inner}</span>
                </li>
              )
            })}
          </ul>

          {/* Плашка рейтинга под фактами, кнопка под плашкой */}
          <div className="mt-6 flex flex-col gap-5 lg:gap-4">
            <RatingBadge source={SOURCES.avito} />
            <Button
              as="a"
              href="#calculator"
              arrow
              fullMobile
              ref={ctaRef}
              onMouseEnter={cancelBreathe}
              onPointerDown={cancelBreathe}
              onFocus={cancelBreathe}
              className={`self-start${breathe ? ' bv-breathe' : ''}`}
            >
              Рассчитать стоимость
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
