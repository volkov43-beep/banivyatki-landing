// Called by locations.browser.mjs on both pages at each supported viewport.
import assert from 'node:assert/strict'
import { FAQ, plainAnswer } from '../../src/data/faq.js'
import { REGIONS } from '../../src/data/regions.js'
import { MIN_PRICE } from '../../src/data/calculator.js'

export async function checkFaq(page, regional) {
  const config = REGIONS.syktyvkar
  const remoteQuestion = 'Можно ли заказать баню, не приезжая в Киров?'
  const expectedTitles = FAQ.map(item => item.q)
  if (regional) expectedTitles.push(remoteQuestion)
  const count = regional ? 19 : 18
  const faq = page.locator('#faq')
  const rows = faq.locator('details')
  const schemas = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts =>
    scripts.map(script => JSON.parse(script.textContent)).filter(json => json['@type'] === 'FAQPage')
  )
  assert.equal(await rows.count(), count)
  assert.equal(schemas.length, 1)
  const [schema] = schemas
  assert.equal(schema['@context'], 'https://schema.org')
  assert.equal(schema['@type'], 'FAQPage')
  assert.equal(schema.mainEntity.length, count)
  assert.deepEqual(await rows.locator('summary').allTextContents(), expectedTitles)
  assert.equal(new Set(expectedTitles).size, count)
  assert.equal(await faq.getByText(remoteQuestion, { exact: true }).count(), regional ? 1 : 0)
  assert.equal(await page.locator('footer').getByText(regional ? 'Шоурум в Кирове: ул. Ленина, 71Б' : 'Киров, ул. Ленина, 71Б', { exact: true }).count(), 1)

  const overrides = regional ? config.faqAnswers(MIN_PRICE + config.priceAdjustment) : {}
  const items = regional ? FAQ.concat(config.additionalFaqQuestions) : FAQ
  for (const [index, item] of items.entries()) {
    const row = rows.nth(index)
    const summary = row.locator('summary')
    await summary.press('Enter')
    await page.waitForFunction(n => window.probe.goals.some(g => g.goal === 'faq_open' && g.params.question === n), item.n)
    const answer = row.locator('summary + div')
    assert.ok(await answer.isVisible())
    const visible = await answer.locator('p, li').evaluateAll(parts => parts.map(el =>
      (el.tagName === 'LI' ? '— ' : '') + el.innerText
    ).join('\n'))
    assert.deepEqual(schema.mainEntity[index], {
      '@type': 'Question',
      name: await summary.innerText(),
      acceptedAnswer: { '@type': 'Answer', text: visible },
    })
    assert.equal(visible, plainAnswer(overrides[item.n] ? { ...item, text: overrides[item.n] } : item))
    assert.doesNotMatch(visible, /\]\(#/)
    assert.ok(await row.evaluate(el => {
      const [title, icon] = el.querySelector('summary').children
      const b = el.getBoundingClientRect()
      if (title.getBoundingClientRect().right > icon.getBoundingClientRect().left) return false
      return [...el.querySelectorAll('p, li, summary > span:first-child')].every(part => {
        const range = document.createRange()
        range.selectNodeContents(part)
        return [...range.getClientRects()].every(r => r.left >= b.left - 1 && r.right <= b.right + 1)
      }) && document.documentElement.scrollWidth <= innerWidth
    }), item.q + ': text must fit the expanded row')
    for (const link of await answer.getByRole('link').all()) {
      const href = await link.getAttribute('href')
      assert.equal(href, item.n === 17 ? '#visit-form' : '#calculator')
      assert.equal(await page.locator(href).count(), 1)
      if (href === '#calculator') {
        await link.press('Enter')
        assert.equal(new URL(page.url()).hash, href)
      }
    }
    await summary.press('Space')
    assert.ok(await answer.isHidden())
  }
  const opened = await page.evaluate(() => window.probe.goals.filter(g => g.goal === 'faq_open').map(g => g.params.question))
  assert.deepEqual(opened, Array.from({ length: count }, (_, i) => i + 1))

  if (regional) {
    const answer = n => schema.mainEntity[n - 1].acceptedAnswer.text
    assert.match(answer(2), /банковский кредит и рассрочка/i)
    assert.match(answer(2), /без банка/)
    assert.match(answer(3), /от 5 000 ₽/)
    assert.match(answer(3), /наличные, перевод и карту, для организаций — безналичный расчёт/)
    assert.match(answer(4), /до начала изготовления/)
    assert.match(answer(9), /винтовые сваи или блоки/)
    assert.match(answer(14), /на основные узлы бани — 5 лет/)
    assert.match(answer(14), /ежегодное сервисное обслуживание продлевает гарантию ещё на год/)
    assert.match(answer(15), /Обслуживание платное/)
    assert.match(answer(15), /заранее согласует/)
    assert.match(answer(19), /порядок оформления документов и оплаты/)
  }
}
