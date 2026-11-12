// Run from the repository root with the same BV_JSDOM_PATH as cta.dom.mjs.
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

const { JSDOM } = await import(process.env.BV_JSDOM_PATH || 'jsdom')
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, logLevel: 'silent' })
try {
  const { default: SectionFaq } = await vite.ssrLoadModule('/src/components/SectionFaq.jsx')
  const sample = {
    n: 19,
    q: 'Что означает «А < Б»?',
    text: 'Пояснение <пример> и [расчёт](#calculator).',
    list: ['[Показ](#visit-form) и «А & Б»'],
    after: 'Ещё раз [к расчёту](#calculator).',
  }
  const html = renderToStaticMarkup(createElement(SectionFaq, { additionalQuestions: [sample] }))
  const document = new JSDOM(html).window.document
  const script = document.querySelector('script[type="application/ld+json"]')
  assert.ok(!script.textContent.includes('<'))
  const schema = JSON.parse(script.textContent)
  const row = document.querySelector('#faq details:last-of-type')
  assert.equal(row.querySelector('summary').textContent, sample.q)
  assert.deepEqual([...row.querySelectorAll('a')].map(a => a.hash), ['#calculator', '#visit-form', '#calculator'])
  const [intro, list, ending] = row.querySelectorAll('p, li')
  assert.deepEqual(schema.mainEntity.at(-1), {
    '@type': 'Question',
    name: sample.q,
    acceptedAnswer: { '@type': 'Answer', text: [intro.textContent, '— ' + list.textContent, ending.textContent].join('\n') },
  })
  console.log('FAQ HTML and JSON-LD round trip passed for text, list, trailing paragraph, links and special characters.')
} finally {
  await vite.close()
}
