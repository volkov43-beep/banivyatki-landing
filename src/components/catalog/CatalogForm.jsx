import { useEffect, useId, useRef, useState } from 'react'
import Button from '../Button.jsx'
import Segmented from '../calculator/Segmented.jsx'
import { submitLead } from '../../lib/submitLead.js'
import { getUtm } from '../../lib/utm.js'
import { track } from '../../lib/track.js'
import { formatPhone, isCompletePhone, normalizePhone } from '../../lib/phone.js'
import { PHONE } from '../../data/calculator.js'

const CONTACT = [{ id: 'call', label: 'Звонок' }, { id: 'max', label: 'MAX' }]
const MIN_FILL_MS = 3000
const fieldClass = 'w-full rounded border border-[rgba(244,234,223,0.28)] bg-transparent px-4 py-3 text-body text-surface placeholder:text-muted-on-dark'

export default function CatalogForm({ model }) {
  const id = useId()
  const phoneRef = useRef(null)
  const mountedAt = useRef(Date.now())
  const sending = useRef(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('call')
  const [consent, setConsent] = useState(false)
  const [trap, setTrap] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle')
  const phoneOk = isCompletePhone(phone)

  useEffect(() => {
    mountedAt.current = Date.now()
    phoneRef.current?.focus({ preventScroll: true })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (sending.current) return
    setTouched(true)
    if (!phoneOk || !consent || !CONTACT.some((option) => option.id === contact)) return
    if (trap || Date.now() - mountedAt.current < MIN_FILL_MS) {
      setStatus('done')
      return
    }
    sending.current = true
    setStatus('sending')
    const result = await submitLead({
      form: 'catalog',
      catalog_model: model.crmCode,
      phone: normalizePhone(phone),
      name: name.trim(),
      contact_method: contact,
      ...getUtm(),
      page_url: window.location.href,
      submitted_at: new Date().toISOString(),
      elapsed_ms: Date.now() - mountedAt.current,
      website: trap,
    })
    sending.current = false
    if (result.ok) {
      track('catalog_submit', { model: model.crmCode })
      setStatus('done')
    } else {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return <p role="status" className="text-body">Заявка принята. Менеджер свяжется с вами и отправит каталог.</p>
  }

  return (
    <>
      <p className="mb-6 text-body text-muted-on-dark">Интересующая модель: {model.title}</p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-[15px]">Телефон</span>
            <input ref={phoneRef} autoFocus type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+7 (___) ___-__-__" aria-invalid={touched && !phoneOk} aria-describedby={touched && !phoneOk ? `${id}-phone-error` : undefined} className={fieldClass} />
            {touched && !phoneOk && <span id={`${id}-phone-error`} className="mt-1 block text-label text-alert-on-dark">Введите номер полностью</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-[15px]">Имя (необязательно)</span>
            <input type="text" autoComplete="name" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" className={fieldClass} />
          </label>
          <div onKeyDown={(e) => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
            e.preventDefault()
            const index = CONTACT.findIndex((option) => option.id === contact)
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? CONTACT.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1) + CONTACT.length) % CONTACT.length
            setContact(CONTACT[next].id)
            e.currentTarget.querySelectorAll('[role="radio"]')[next]?.focus()
          }}>
            <p className="mb-2 text-[15px]">Способ связи</p>
            <Segmented label="Способ связи" options={CONTACT} value={contact} onChange={setContact} size="sm" full scheme="dark" />
          </div>
          <div hidden aria-hidden="true">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </div>
          <label className="flex items-start gap-3 text-label text-muted-on-dark">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-describedby={touched && !consent ? `${id}-consent-error` : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-accent" />
            <span>Согласен с <a href={`${import.meta.env.BASE_URL}privacy/`} target="_blank" rel="noopener noreferrer" className="underline">политикой обработки персональных данных</a></span>
          </label>
          {touched && !consent && <p id={`${id}-consent-error`} className="text-label text-alert-on-dark">Нужно согласие на обработку данных</p>}
        </div>
        <Button type="submit" disabled={status === 'sending'} full className="mt-6 whitespace-nowrap">
          {status === 'sending' ? 'Отправляем…' : 'Получить каталог'}
        </Button>
        {status === 'error' && (
          <p role="alert" className="mt-4 text-label text-alert-on-dark">
            Не удалось отправить заявку. Попробуйте ещё раз или позвоните: <a href={`tel:${PHONE.tel}`} className="font-bold text-surface">{PHONE.display}</a>
          </p>
        )}
      </form>
    </>
  )
}
