/** Маска +7 (___) ___-__-__ и нормализация номера. */

/** Десять цифр после кода страны из любого ввода. */
export function digitsOf(value) {
  let digits = String(value).replace(/\D/g, '')
  if (digits.startsWith('7') || digits.startsWith('8')) digits = digits.slice(1)
  return digits.slice(0, 10)
}

export function formatPhone(value) {
  const d = digitsOf(value)
  if (!d) return ''
  let out = `+7 (${d.slice(0, 3)}`
  if (d.length >= 3) out += ')'
  if (d.length > 3) out += ` ${d.slice(3, 6)}`
  if (d.length > 6) out += `-${d.slice(6, 8)}`
  if (d.length > 8) out += `-${d.slice(8, 10)}`
  return out
}

export function isCompletePhone(value) {
  return digitsOf(value).length === 10
}

/** +79001234567 для payload. */
export function normalizePhone(value) {
  return `+7${digitsOf(value)}`
}
