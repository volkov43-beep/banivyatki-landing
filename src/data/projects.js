/**
 * Блок «Проекты» (второй экран): шесть базовых комплектаций — те же
 * карточки, что в калькуляторе. Цена «от» берётся из data/calculator.js
 * по cardId (единственное место цен), здесь только название, состав и фото.
 *
 * photo — либо { name } для фото в двух ширинах (ResponsivePhoto,
 * `<name>-1280.webp` / `<name>-640.webp`), либо { src, width, height }
 * для одного файла из фотобанка (public/photos). Правило подбора: тёплый
 * сезон — кадры с зеленью, круглый год — зимние; один кадр в двух карточках
 * не используется. Для «3 м, круглый год» зимнего кадра 3 м нет —
 * стоит кадр 3 м из фотобанка (лужайка).
 */
import { CARDS } from './calculator.js'

export const PROJECTS_TITLE = 'Проекты'
export const PROJECTS_SUBTITLE = 'Шесть готовых решений — выбирайте размер и сезон'
export const PROJECTS_NOTE =
  'Это базовые комплектации. Терраса, душ, панорамное окно и другие опции считаются отдельно.'

export const PROJECTS = [
  {
    id: 'warm-3',
    season: 'warm',
    cardId: 'warm-3',
    name: '3 м, тёплый сезон',
    inside: 'Парная и раздевалка',
    photo: { name: 'obekt-1-zoniha-glavnoe', alt: 'Баня-Подкова 3 м на участке летом' },
  },
  {
    id: 'warm-4',
    season: 'warm',
    cardId: 'warm-45',
    name: '4 м, тёплый сезон',
    inside: 'Парная и комната отдыха',
    photo: { name: 'obekt-2-doronichi-glavnoe', alt: 'Баня-Подкова 4 м на участке летом' },
  },
  {
    id: 'warm-6',
    season: 'warm',
    cardId: 'warm-6',
    name: '6 м, тёплый сезон',
    inside: 'Парная, моечная, комната отдыха',
    photo: { src: 'photos/size-6m.webp', width: 800, height: 597, alt: 'Баня-Подкова 6 м на лужайке' },
  },
  {
    id: 'year-3',
    season: 'year',
    cardId: 'year-3',
    name: '3 м, круглый год',
    inside: 'Парная и раздевалка, утепление',
    photo: { src: 'photos/size-3m.webp', width: 800, height: 597, alt: 'Баня-Подкова 3 м на лужайке' },
  },
  {
    id: 'year-45',
    season: 'year',
    cardId: 'year-45',
    name: '4,5 м, круглый год',
    inside: 'Парная и комната отдыха, утепление',
    photo: { name: 'obekt-3-slobodskoy-glavnoe', alt: 'Баня-Подкова 4,5 м зимой, топится' },
  },
  {
    id: 'year-6',
    season: 'year',
    cardId: 'year-6',
    name: '6 м, круглый год',
    inside: 'Парная, моечная, комната отдыха, утепление',
    photo: { name: 'obekt-4-chepetsk-glavnoe', alt: 'Баня-Подкова 6 м зимой' },
  },
]

/** Цена «от» проекта — из карточки калькулятора с тем же cardId. */
export function projectPrice(project) {
  const card = CARDS[project.season].find((c) => c.id === project.cardId)
  return card ? card.price : null
}
