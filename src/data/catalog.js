export const CATALOG_TITLE = 'Выберите свою баню'
export const CATALOG_SUBTITLE = 'Три размера под разные задачи и участок'

// All approved masters share this aspect ratio. Keep the entire composition.
export const CATALOG_IMAGE_RATIO = '2048/1529'
export const CATALOG_IMAGE_SIZES = '(min-width: 1200px) 352px, (min-width: 1024px) calc((100vw - 144px) / 3), (min-width: 768px) calc((100vw - 112px) / 2), (min-width: 600px) calc((100vw - 64px) / 2), calc(100vw - 48px)'

export const CATALOG_MODELS = [
  {
    id: 'podkova-35', crmCode: 'podkova-35', title: 'Подкова 3,5 м',
    tagline: 'Компактная для небольшого участка', dimensions: '3,5 × 2,4 м',
    sections: '2 секции', capacity: 'до 4 чел.', priceFrom: null,
    catalogImage: 'podkova-35-catalog', planImage: 'podkova-35-plan',
    alt: 'Баня «Подкова» 3,5 м', planAlt: 'Планировка бани «Подкова» 3,5 м',
  },
  {
    id: 'podkova-45', crmCode: 'podkova-45', title: 'Подкова 4,5 м',
    tagline: 'Для семьи', dimensions: '4,5 × 2,4 м',
    sections: '2 секции', capacity: 'для 4–6 чел.', priceFrom: null,
    catalogImage: 'podkova-45-catalog', planImage: 'podkova-45-plan',
    alt: 'Баня «Подкова» 4,5 м', planAlt: 'Планировка бани «Подкова» 4,5 м',
  },
  {
    id: 'podkova-60', crmCode: 'podkova-60', title: 'Подкова 6 м',
    tagline: 'Три полноценные зоны', dimensions: '6 × 2,4 м',
    sections: '3 секции', capacity: 'для 5–8 чел.', priceFrom: null,
    catalogImage: 'podkova-60-catalog', planImage: 'podkova-60-plan',
    alt: 'Баня «Подкова» 6 м', planAlt: 'Планировка бани «Подкова» 6 м',
  },
]
