#!/usr/bin/env node
/**
 * Координаты мест для блока «Где стоят наши бани».
 *
 * Читает src/data/objects.js, для каждого места спрашивает HTTP Геокодер
 * Яндекса и переписывает файл с полученными координатами. Страница геокодер
 * не вызывает — только читает objects.js.
 *
 * Запуск (ключ — тот же, что для карт, JavaScript API и HTTP Геокодер):
 *   VITE_YMAPS_KEY=ваш_ключ node scripts/geocode.mjs
 * или положите ключ в .env (VITE_YMAPS_KEY=…) и запустите node scripts/geocode.mjs.
 *
 * В конце скрипт печатает список спорных мест: геокодер вернул несколько
 * вариантов, точность ниже населённого пункта, или точка группы oblast
 * вылетела за границы Кировской области. Их надо проверить вручную.
 *
 * Запрос уходит с заголовком Referer сайта: если у ключа стоит ограничение
 * по HTTP Referer, без него геокодер ответит 403.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FILE = path.join(ROOT, 'src/data/objects.js')

function readKey() {
  if (process.env.VITE_YMAPS_KEY) return process.env.VITE_YMAPS_KEY
  try {
    const env = readFileSync(path.join(ROOT, '.env'), 'utf8')
    const m = env.match(/^VITE_YMAPS_KEY=(.+)$/m)
    if (m) return m[1].trim()
  } catch {
    /* .env нет */
  }
  return ''
}

const KEY = readKey()
if (!KEY) {
  console.error('Нет ключа. Запустите: VITE_YMAPS_KEY=ваш_ключ node scripts/geocode.mjs')
  process.exit(1)
}

const { OBJECTS, OBLAST_BOUNDS } = await import(FILE)

/** Уточнения запроса для мест, у которых есть тёзки. */
const QUERY_HINTS = {
  'Луза (Слободской р-н)': 'Кировская область, Слободской район, деревня Луза',
  'Карино (Слободской р-н)': 'Кировская область, Слободской район, село Карино',
  'Ключи (Кирово-Чепецкий р-н)': 'Кировская область, Кирово-Чепецкий район, Ключи',
  'Киров и пригороды': 'Кировская область, город Киров',
}

function queryFor(place) {
  if (QUERY_HINTS[place.name]) return QUERY_HINTS[place.name]
  const m = place.name.match(/^(.+?) \((.+?) р-н\)$/)
  if (m) return `${place.region}, ${m[2]} район, ${m[1]}`
  return `${place.region}, ${place.name}`
}

async function geocode(query) {
  const url = new URL('https://geocode-maps.yandex.ru/1.x/')
  url.searchParams.set('apikey', KEY)
  url.searchParams.set('format', 'json')
  url.searchParams.set('lang', 'ru_RU')
  url.searchParams.set('results', '5')
  url.searchParams.set('geocode', query)
  const res = await fetch(url, { headers: { Referer: 'https://volkov43-beep.github.io/' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} для «${query}»`)
  const json = await res.json()
  const members = json.response?.GeoObjectCollection?.featureMember || []
  return members.map(({ GeoObject }) => {
    const [lon, lat] = GeoObject.Point.pos.split(' ').map(Number)
    const meta = GeoObject.metaDataProperty.GeocoderMetaData
    return { lat, lon, kind: meta.kind, precision: meta.precision, text: meta.text }
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const inOblast = (p) =>
  p.lat >= OBLAST_BOUNDS.latMin && p.lat <= OBLAST_BOUNDS.latMax && p.lon >= OBLAST_BOUNDS.lonMin && p.lon <= OBLAST_BOUNDS.lonMax

const result = []
const doubtful = []
for (const place of OBJECTS) {
  const query = queryFor(place)
  let variants = []
  try {
    variants = await geocode(query)
  } catch (e) {
    doubtful.push(`${place.name}: ошибка запроса (${e.message})`)
    result.push(place)
    continue
  }
  if (!variants.length) {
    doubtful.push(`${place.name}: геокодер ничего не нашёл по запросу «${query}»`)
    result.push(place)
    continue
  }
  const best = variants[0]
  const updated = { ...place, lat: +best.lat.toFixed(4), lon: +best.lon.toFixed(4) }
  result.push(updated)
  const reasons = []
  if (variants.length > 1) reasons.push(`${variants.length} варианта: ${variants.map((v) => v.text).join(' | ')}`)
  if (best.kind !== 'locality') reasons.push(`точность «${best.kind}» (не населённый пункт): ${best.text}`)
  if (place.group !== 'far' && !inOblast(updated)) reasons.push(`за границами Кировской области: ${updated.lat}, ${updated.lon}`)
  if (reasons.length) doubtful.push(`${place.name}: ${reasons.join('; ')}`)
  console.log(`${place.name} → ${updated.lat}, ${updated.lon} (${best.kind}) ${best.text}`)
  await sleep(150)
}

// Переписываем файл: шапка и служебные экспорты остаются, массив — новый
const src = readFileSync(FILE, 'utf8')
const start = src.indexOf('export const OBJECTS = [')
const end = src.indexOf('\n]\n', start) + 3
const lines = result.map(
  (p) => `  { name: '${p.name}', region: '${p.region}', lat: ${p.lat}, lon: ${p.lon}, group: '${p.group}' },`,
)
const groups = ['kirov', 'oblast', 'far']
const body = groups
  .map((g) => lines.filter((_, i) => result[i].group === g).join('\n'))
  .join('\n\n')
writeFileSync(FILE, `${src.slice(0, start)}export const OBJECTS = [\n${body}\n]\n${src.slice(end)}`)

console.log(`\nЗаписано ${result.length} мест в src/data/objects.js`)
if (doubtful.length) {
  console.log('\nПроверить вручную:')
  for (const d of doubtful) console.log(`- ${d}`)
} else {
  console.log('\nСпорных мест нет.')
}
