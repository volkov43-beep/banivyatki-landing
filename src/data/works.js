/**
 * Блок «Наши работы»: объекты у клиентов. Подписи — буквально из задания,
 * без цен, сроков и отзывов. Фото лежат в public/photos в двух ширинах:
 * `<name>-1280.webp` и `<name>-640.webp`, 4:3, без EXIF (участки клиентов).
 *
 * name — название объекта для целей Метрики (works_photo_open, works_calc_click);
 * calc — сезон и карточка калькулятора для кнопки «Рассчитать такую»
 * (null — кнопки нет).
 */
export const WORKS_TITLE = 'Наши работы'
export const WORKS_SUBTITLE = 'Подковы, которые уже стоят у наших клиентов'

export const WORKS = [
  {
    id: 'zoniha',
    name: 'Зониха',
    caption: 'Зониха · 3 м · лето · июль 2026',
    photos: [
      { name: 'obekt-1-zoniha-glavnoe', alt: 'Баня-Подкова 3 м в Зонихе' },
      { name: 'obekt-1-zoniha-2', alt: 'Баня-Подкова 3 м в Зонихе' },
    ],
    calc: { season: 'warm', cardId: 'warm-3' },
  },
  {
    id: 'doronichi',
    name: 'Дороничи',
    caption: 'Дороничи · 4 м · круглый год · май 2026',
    photos: [
      { name: 'obekt-2-doronichi-glavnoe', alt: 'Баня-Подкова 4 м в Дороничах' },
      { name: 'obekt-2-doronichi-2', alt: 'Баня-Подкова 4 м в Дороничах' },
    ],
    calc: { season: 'year', cardId: 'year-45' },
  },
  {
    id: 'slobodskoy',
    name: 'Слободской',
    caption: 'Слободской · 4,5 м · круглый год · декабрь 2025',
    photos: [
      { name: 'obekt-3-slobodskoy-glavnoe', alt: 'Баня-Подкова 4,5 м в Слободском' },
      { name: 'obekt-3-slobodskoy-2', alt: 'Баня-Подкова 4,5 м в Слободском' },
    ],
    calc: { season: 'year', cardId: 'year-45' },
  },
  {
    id: 'chepetsk',
    name: 'Кирово-Чепецк',
    caption: 'Кирово-Чепецк · 6 м · круглый год · февраль 2026',
    photos: [
      { name: 'obekt-4-chepetsk-glavnoe', alt: 'Баня-Подкова 6 м в Кирово-Чепецке' },
      { name: 'obekt-4-chepetsk-2', alt: 'Баня-Подкова 6 м в Кирово-Чепецке' },
    ],
    calc: { season: 'year', cardId: 'year-6' },
  },
  {
    id: 'babichi',
    name: 'Бабичи',
    caption: 'Бабичи · 6 м с террасой и душем · круглый год · октябрь 2025',
    photos: [
      { name: 'obekt-5-babichi-glavnoe', alt: 'Баня-Подкова 6 м в Бабичах' },
      { name: 'obekt-5-babichi-2', alt: 'Баня-Подкова 6 м в Бабичах' },
    ],
    calc: { season: 'year', cardId: 'year-6' },
  },
  {
    id: 'ustanovka',
    name: 'Доставка и установка',
    caption: 'Доставка и установка · привозим готовой и ставим за один день',
    photos: [
      { name: 'obekt-6-ustanovka-glavnoe', alt: 'Доставка бани-Подковы манипулятором' },
      { name: 'obekt-6-ustanovka-2', alt: 'Установленная баня-Подкова на участке' },
    ],
    calc: null,
  },
]
