import { useEffect, useRef, useState } from 'react'
import Segmented from '../calculator/Segmented.jsx'
import Button from '../Button.jsx'
import { submitLead } from '../../lib/submitLead.js'
import { track } from '../../lib/track.js'
import { getUtm } from '../../lib/utm.js'
import { callbackWhen } from '../../lib/callback.js'
import { formatPhone, isCompletePhone, normalizePhone } from '../../lib/phone.js'
import { VISIT_TYPES, VISIT_FORM } from '../../data/visit.js'

const BASE = import.meta.env.BASE_URL
const CONTACT = [
  { id: 'call', label: 'Звонок' },
  { id: 'max', label: 'MAX' },
]
const MIN_FILL_MS = 3000

/** Поле на тёмном фоне — как в карточке вопроса FAQ. */
const fieldClass =
  'w-full rounded border border-[rgba(244,234,223,0.28)] bg-transparent px-4 py-3 text-body text-surface placeholder:text-muted-on-dark'

/**
 * Форма записи на показ: одна на три карточки, на фоне forest — тот же стиль,
 * что карточка вопроса в FAQ. Способ показа (visitType / onVisitTypeChange)
 * хранит блок: кнопки в карточках выбирают его снаружи.
 *
 * Отправка через submitLead() с form: "visit" и visit_type; защита — ловушка
 * и минимум 3 секунды на заполнение. После отправки форма скрывается,
 * остаётся подтверждение с обещанием по московскому времени (callbackWhen).
 * Цель Метрики visit_submit с типом — только при успешной отправке.
 *
 * ref — на карточку: блок прокручивает к ней по кнопкам в карточках.
 */
export default function VisitForm({ ref, visitType, onVisitTypeChange }) {
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
      form: 'visit',
      visit_type: visitType,
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
      track('visit_submit', { type: visitType })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const error = (text) => <span className="mt-1 block text-label text-alert-on-dark">{text}</span>

  return (
    <div ref={ref} id="visit-form" className="scroll-mt-6 rounded-md bg-forest p-5 text-surface md:p-8">
      {status === 'done' ? (
        <p role="status" className="text-center text-title">
          Заявка отправлена. Менеджер перезвонит {when}.
        </p>
      ) : (
        <>
          <h3 className="text-center text-[24px] font-bold leading-[1.2]">{VISIT_FORM.title}</h3>
          <p className="mt-2 text-center text-body text-muted-on-dark">
            Менеджер перезвонит {when} и согласует удобное время
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-6">
            <div className="flex flex-col gap-4">
              <Segmented label="Способ показа" options={VISIT_TYPES} value={visitType} onChange={onVisitTypeChange} size="xs" full scheme="dark" />

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

            <Button type="submit" disabled={status === 'sending'} full className="mt-6">
              {VISIT_FORM.button}
            </Button>

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
        </>
      )}
    </div>
  )
}
