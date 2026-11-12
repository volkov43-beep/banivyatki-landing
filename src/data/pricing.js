import { CARDS, MIN_PRICE } from './calculator.js'
import { WORKS } from './works.js'

// Always start from the Kirov data. Works without a price stay unpriced.
export function getRegionalPrices(adjustment) {
  const priceFor = base => base + adjustment
  function adjustItems(items) {
    if (adjustment === 0) return items
    return items.map(item => item.price == null ? item : { ...item, price: priceFor(item.price) })
  }

  return {
    minimum: priceFor(MIN_PRICE),
    cards: Object.fromEntries(Object.entries(CARDS).map(([season, cards]) => [season, adjustItems(cards)])),
    works: adjustItems(WORKS),
  }
}
