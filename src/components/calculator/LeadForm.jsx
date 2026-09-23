import { useEffect, useRef, useState } from 'react'
import Segmented from './Segmented.jsx'
import Button from '../Button.jsx'
import { PHONE } from '../../data/calculator.js'
import { submitLead } from '../../lib/submitLead.js'
import { track } from '../../lib/track.js'
import { getUtm } from '../../lib/utm.js'
import { callbackPromise } from '../../lib/callback.js'
import { formatPhone, isCompletePhone, normalizePhone } from '../../lib/phone.js'

const BASE = import.meta.env.BASE_URL
const CONTACT = [
  { id: 'call', label: 'Звонок' },
  { id: 'max', label: 'MAX' },
]
const MIN_FILL_MS = 3000

const inputClass =
  'w-full rounded border border-muted bg-surface px-4 py-3 text-body text-ink placeholder:text-muted'

/**
 * Общая форма заявки для калькулятора и вкладки «Для бизнеса».
 *
 * variant: 'calculator' | 'business'
 * lead: поля, которые форма добавляет в payload (season, card_id, …)
 * onSuccess: вызывается после успешной отправки
 *
 * Защита от спама: скрытое поле-ловушка и проверка, что форму заполняли
 * дольше трёх секунд. Без капчи.
 */
export default function LeadForm({ variant, lead = {}, submitLabel, goal, formRef, onSuccess }) {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [comment, setComment] = useState('')
  const [contact, setContact] = useState('call')
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [touched, setTouched] = useState(false)
  const [donePromise, setDonePromise] = useState('')
  const mountedAt = useRef(Date.now())
  const promise = callbackPromise()

  useEffect(() => {
    mountedAt.current = Date.now()
  }, [])

  const phoneOk = isCompletePhone(phone)
  const canSubmit = phoneOk && consent && status !== 'sending'

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!phoneOk || !consent) return

    // Ловушка для ботов: поле заполнено или форма отправлена быстрее 3 секунд
    if (trap || Date.now() - mountedAt.current < MIN_FILL_MS) {
      setDonePromise(promise)
      setStatus('done')
      return
    }

    const payload = {
      form: variant,
      season: '',
      card_id: '',
      card_title: '',
      size: '',
      price_shown: null,
      ...lead,
      phone: normalizePhone(phone),
      name: name.trim(),
      ...(variant === 'business' ? { company: company.trim(), comment: comment.trim() } : {}),
      contact_method: contact,
      ...getUtm(),
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
    }

    setStatus('sending')
    try {
      const result = await submitLead(payload)
      if (!result?.ok) throw new Error('submitLead failed')
      track(goal)
      setDonePromise(promise)
      setStatus('done')
      onSuccess?.()
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div ref={formRef} className="rounded-md border border-accent p-6" role="status">
        <p className="text-title">Заявка принята</p>
        <p className="mt-2 text-body">{donePromise}</p>
      </div>
    )
  }

  const isBusiness = variant === 'business'

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="text-ink">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-[15px]">Телефон</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="+7 (___) ___-__-__"
            aria-invalid={touched && !phoneOk}
            className={inputClass}
          />
          {touched && !phoneOk && <span className="mt-1 block text-label text-alert">Введите номер полностью</span>}
        </label>

        <label className="block">
          <span className="mb-1 block text-[15px]">Имя</span>
          <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>

        {isBusiness && (
          <>
            <label className="block">
              <span className="mb-1 block text-[15px]">Название компании</span>
              <input type="text" autoComplete="organization" value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[15px]">Комментарий</span>
              <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} className={inputClass} />
            </label>
          </>
        )}

        <div>
          <span className="mb-1 block text-[15px]">Как связаться</span>
          <Segmented label="Как связаться" options={CONTACT} value={contact} onChange={setContact} size="sm" />
        </div>

        {/* Ловушка для ботов: людям не видна */}
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label>
            Сайт
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>

        <label className="flex items-start gap-3 text-[15px]">
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
        {touched && !consent && <span className="-mt-2 block text-label text-alert">Нужно согласие на обработку данных</span>}
      </div>

      {status === 'error' && (
        <p role="alert" className="mt-5 text-body text-alert">
          Заявка не отправилась. Позвоните нам:{' '}
          <a href={`tel:${PHONE.tel}`} className="font-bold text-ink no-underline">
            {PHONE.display}
          </a>
        </p>
      )}

      <Button type="submit" disabled={status === 'sending'} aria-disabled={!canSubmit} fullMobile className="mt-6">
        {submitLabel}
      </Button>
      <p className="mt-3 text-label text-muted">{promise}</p>
    </form>
  )
}
