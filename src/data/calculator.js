/**
 * Данные калькулятора. Цены правятся только здесь.
 * Минимальная цена (293 000 ₽) обязана совпадать с ценой на первом экране —
 * SectionHero берёт её из MIN_PRICE.
 */

export const SEASONS = [
  { id: 'warm', label: 'В тёплый сезон', short: 'тёплый сезон' },
  { id: 'year', label: 'Круглый год, включая морозы', short: 'круглый год' },
]

const DELIVERY_BY_ADDRESS = 'Доставка — рассчитаем по адресу'
const DELIVERY_INCLUDED = 'Доставка до 20 км от Кирова включена'

/** Планировки: длина в метрах и помещения слева направо с долей длины. */
export const LAYOUTS = {
  3: { length: 3, rooms: [{ name: 'раздевалка', share: 0.5 }, { name: 'парная', share: 0.5, sauna: true }] },
  4.5: {
    length: 4.5,
    rooms: [
      { name: 'комната отдыха', share: 0.52 },
      { name: 'парная', share: 0.48, sauna: true },
    ],
  },
  6: {
    length: 6,
    rooms: [
      { name: 'комната отдыха', share: 0.42 },
      { name: 'моечная', share: 0.25 },
      { name: 'парная', share: 0.33, sauna: true },
    ],
  },
}

export const CARDS = {
  warm: [
    {
      id: 'warm-3',
      title: 'Попариться и переодеться',
      size: '3 м',
      layout: 3,
      photo: 'photos/size-3m.webp',
      price: 293000,
      inside: 'Парная и раздевалка. Двойной проливной пол, вентиляция, электрика',
      delivery: DELIVERY_BY_ADDRESS,
    },
    {
      id: 'warm-45',
      title: 'Попариться и посидеть после',
      size: '4–4,5 м',
      layout: 4.5,
      photo: 'photos/size-4-5m.webp',
      price: 330000,
      inside: 'Парная и комната отдыха. Готовая баня: электрика, полки из осины, топка с выносом наружу',
      delivery: DELIVERY_INCLUDED,
    },
    {
      id: 'warm-6',
      title: 'Помыться и остаться на вечер',
      size: '6 м',
      layout: 6,
      photo: 'photos/size-6m.webp',
      price: 374000,
      inside:
        'Парная, моечная и комната отдыха. Готовая баня: электрика, полки из осины, топка с выносом наружу',
      delivery: DELIVERY_INCLUDED,
    },
  ],
  year: [
    {
      id: 'year-3',
      title: 'Попариться и переодеться',
      size: '3 м',
      layout: 3,
      photo: 'photos/size-3m.webp',
      price: 333000,
      inside: 'Парная и раздевалка. Утеплённая парная, двойной проливной пол, вентиляция, электрика',
      delivery: DELIVERY_BY_ADDRESS,
    },
    {
      id: 'year-45',
      title: 'Попариться и посидеть после',
      size: '3,5–4,5 м',
      layout: 4.5,
      photo: 'photos/size-4-5m.webp',
      price: 363000,
      inside: 'Парная и комната отдыха. Утеплённая парная, двойной проливной пол, вентиляция, электрика',
      delivery: DELIVERY_BY_ADDRESS,
    },
    {
      id: 'year-6',
      title: 'Помыться и остаться на вечер',
      size: '6 м',
      layout: 6,
      photo: 'photos/size-6m.webp',
      price: 515000,
      inside:
        'Парная, моечная и комната отдыха. Утеплённая парная, двойной проливной пол, вентиляция, электрика',
      delivery: DELIVERY_BY_ADDRESS,
    },
  ],
}

export const MIN_PRICE = Math.min(...Object.values(CARDS).flat().map((c) => c.price))

export const WARM_NOTES = [
  'Баню без утепления тоже топят зимой, как бани-бочки. Прогревается дольше, подтапливать придётся чаще.',
  'Готовую баню 4–6 м потом не утеплить — это другая конструкция. Если нужна зима, выбирайте сразу круглый год.',
]

export const QUOTE =
  'Парилка с паром, как в срубе. Только сруб строится за два миллиона и год времени — здесь недели и под ключ.'

export const BUSINESS = {
  intro: 'Делаем бани для бизнеса:',
  items: ['баню на прицепе — для сдачи в аренду', 'партии бань для глэмпингов и баз отдыха'],
  outro: 'Расскажите о проекте — рассчитаем под вашу задачу.',
}

export const PHONE = { display: '+7 (8332) 77-57-70', tel: '+78332775770' }

/** «от 293 000 ₽» с неразрывными пробелами. */
export function formatPrice(value) {
  return `от ${value.toLocaleString('ru-RU').replace(/\s/g, ' ')} ₽`
}
