/**
 * Обещание перезвонить. Время по Москве.
 *
 *   Пн–Пт, 9:00–17:44                     → в течение 15 минут
 *   Пн–Чт с 17:45 и Вт–Пт до 8:59          → завтра с 9:00
 *   Пт с 17:45, Сб, Вс, Пн до 8:59         → в понедельник с 9:00
 *
 * Граница 17:45, а не 18:00: заявка за пять минут до конца дня
 * не должна обещать 15 минут.
 *
 * Для проверки время можно подменить параметром адреса ?now=2026-09-26T20:00
 * (трактуется как московское).
 */
const TZ = 'Europe/Moscow'
const DAY = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

function moscowParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  return { day: DAY[get('weekday')], hour: Number(get('hour')) % 24, minute: Number(get('minute')) }
}

export function callbackPromise(date = getNow()) {
  const { day, hour, minute } = moscowParts(date)
  const t = hour * 60 + minute
  const workStart = 9 * 60
  const workEnd = 17 * 60 + 45 // не включительно

  if (day <= 5 && t >= workStart && t < workEnd) return 'Перезвоним в течение 15 минут'
  if (day <= 4 && t >= workEnd) return 'Перезвоним завтра с 9:00'
  if (day >= 2 && day <= 5 && t < workStart) return 'Перезвоним завтра с 9:00'
  return 'Перезвоним в понедельник с 9:00'
}

/** Текущее время или подмена из ?now=… для проверки. */
export function getNow() {
  if (typeof window !== 'undefined') {
    const raw = new URLSearchParams(window.location.search).get('now')
    if (raw) {
      const parsed = new Date(/[Z+-]\d{0,2}:?\d{0,2}$/.test(raw) ? raw : `${raw}:00+03:00`)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
  }
  return new Date()
}
