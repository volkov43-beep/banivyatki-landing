import { useEffect, useRef, useState } from 'react'
import Segmented from './calculator/Segmented.jsx'
import { submitLead } from '../lib/submitLead.js'
import { track } from '../lib/track.js'
import { getUtm } from '../lib/utm.js'
import { callbackWhen } from '../lib/callback.js'
import { formatPhone, isCompletePhone, normalizePhone } from '../lib/phone.js'

const BASE = import.meta.env.BASE_URL
const CONTACT = [
  { id: 'call', label: 'Звонок' },
  { id: 'max', label: 'MAX' },
]
const MIN_FILL_MS = 3000

/** Поле на forest — как в форме записи и карточке вопроса FAQ. */
const fieldClass =
  'w-full rounded border border-[rgba(244,234,223,0.28)] bg-transparent px-4 py-3 text-body text-surface placeholder:text-muted-on-dark'

/**
 * Финальная форма: имя (необязательно), телефон с маской, «Звонок / MAX»,
 * кнопка «Получить расчёт» на всю ширину, согласие. Обещание — общая
 * callbackWhen(). Отправка через submitLead() с form: "final"; ловушка и
 * минимум 3 секунды, как в остальных формах. После отправки на месте формы
 * подтверждение с обещанием. Цель final_submit — только при успехе.
 */
export default function FinalForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [contact, setContact] = useState('call')
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [touched, setTouched] = useState(false)
  const mountedAt = useRef(Date.now())
  const when = callbackWhen()

  useEffect(() => {
    mountedAt.current = Date.now()
  }, [])

  const phoneOk = isCompletePhone(phone)

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!phoneOk || !consent) return

    // Ловушка для ботов: поле заполнено или форма отправлена быстрее 3 секунд
    if (trap || Date.now() - mountedAt.current < MIN_FILL_MS) {
      setStatus('done')
      return
    }

    const payload = {
      form: 'final',
      name: name.trim(),
      phone: normalizePhone(phone),
      contact_method: contact,
      ...getUtm(),
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
    }

    setStatus('sending')
    try {
      const result = await submitLead(payload)
      if (!result?.ok) throw new Error('submitLead failed')
      track('final_submit')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const error = (text) => <span className="mt-1 block text-label text-alert-on-dark">{text}</span>

  if (status === 'done') {
    return (
      <p role="status" className="text-center text-title">
        Заявка отправлена. Менеджер перезвонит {when}.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-4">
        {/* От 1024 px имя и телефон в одну строку */}
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="block">
            <span className="sr-only">Имя</span>
            <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя" className={fieldClass} />
          </label>
          <label className="block">
            <span className="sr-only">Телефон</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              aria-invalid={touched && !phoneOk}
              className={fieldClass}
            />
            {touched && !phoneOk && error('Введите номер полностью')}
          </label>
        </div>

        <Segmented label="Как связаться" options={CONTACT} value={contact} onChange={setContact} size="sm" full scheme="dark" />

        {/* Ловушка для ботов: людям не видна */}
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Сайт
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-6 inline-flex h-14 w-full items-center justify-center rounded bg-accent px-8 text-body font-bold text-ink"
      >
        Получить расчёт
      </button>

      {status === 'error' && (
        <p role="alert" className="mt-3 text-body text-alert-on-dark">
          Заявка не отправилась. Попробуйте ещё раз или позвоните нам.
        </p>
      )}

      <label className="mt-4 flex items-start gap-3 text-[15px] text-muted-on-dark">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span>
          Согласен на обработку персональных данных по{' '}
          <a href={`${BASE}privacy/`} target="_blank" rel="noopener noreferrer" className="underline">
            политике конфиденциальности
          </a>
        </span>
      </label>
      {touched && !consent && error('Нужно согласие на обработку данных')}
    </form>
  )
}
