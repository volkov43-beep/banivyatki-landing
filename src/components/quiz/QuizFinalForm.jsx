import { useEffect, useId, useRef, useState } from 'react'
import Button from '../Button.jsx'
import { submitLead } from '../../lib/submitLead.js'
import { getUtm } from '../../lib/utm.js'
import { track } from '../../lib/track.js'
import { formatPhone, isCompletePhone, normalizePhone } from '../../lib/phone.js'
import { PHONE } from '../../data/calculator.js'
import { QUIZ_CONTACT_METHODS, QUIZ_VERSION, QUIZ_SUCCESS } from '../../data/quiz.js'

const fieldClass = 'min-h-11 w-full rounded border border-muted bg-surface-2 px-3 py-2 text-body text-ink placeholder:text-muted'
export default function QuizFinalForm({ answers, startedAt, contactDraft, onContactChange, onSuccess, onBack }) {
  const id = useId()
  const sending = useRef(false)
  const mountedAt = useRef(startedAt)
  const alive = useRef(true)
  const { phone, name, contact, consent } = contactDraft
  const [trap, setTrap] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle')
  const phoneOk = isCompletePhone(phone)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  async function handleSubmit(e) {
    e.preventDefault()
    if (sending.current || status === 'done') return
    setTouched(true)
    if (!phoneOk || !consent || !QUIZ_CONTACT_METHODS.some((m) => m.code === contact)) return
    if (trap || Date.now() - mountedAt.current < 3000) { setStatus('done'); onSuccess(); return }
    sending.current = true
    setStatus('sending')
    const result = await submitLead({
      form: 'quiz', quiz_version: QUIZ_VERSION, ...answers,
      phone: normalizePhone(phone), name: name.trim(), contact_method: contact,
      ...getUtm(), page_url: window.location.href, submitted_at: new Date().toISOString(),
      elapsed_ms: Date.now() - mountedAt.current, website: trap,
    })
    sending.current = false
    if (!alive.current) return
    if (result.ok) { track('quiz_submit'); setStatus('done'); onSuccess() }
    else setStatus('error')
  }
  if (status === 'done') return <p role="status" className="mx-auto max-w-[480px] text-center text-body">{QUIZ_SUCCESS}</p>
  return (
    <div className="mx-auto max-w-[560px]">
      <p className="mb-6 text-center text-body">Оставьте номер телефона. Менеджер свяжется с вами, уточнит детали и отправит подходящие варианты удобным способом.</p>
      <form onSubmit={handleSubmit} noValidate>
        <fieldset disabled={status === 'sending'} className="flex min-w-0 flex-col gap-4">
          <legend className="sr-only">Контактные данные</legend>
          <label className="block"><span className="mb-1 block text-body">Телефон</span>
            <input type="tel" inputMode="tel" autoComplete="tel" required value={phone} onChange={(e) => onContactChange({ phone: formatPhone(e.target.value) })} placeholder="+7 (___) ___-__-__" aria-invalid={touched && !phoneOk} aria-describedby={touched && !phoneOk ? `${id}-phone` : undefined} className={fieldClass} />
            {touched && !phoneOk && <span id={`${id}-phone`} className="mt-1 block text-label text-alert">Введите номер полностью</span>}
          </label>
          <label className="block"><span className="mb-1 block text-body">Имя (необязательно)</span><input type="text" autoComplete="name" maxLength={100} value={name} onChange={(e) => onContactChange({ name: e.target.value })} className={fieldClass} /></label>
          <fieldset aria-describedby={touched && !contact ? `${id}-method` : undefined}>
            <legend className="mb-2 text-body">Способ связи</legend>
            <div className="grid grid-cols-2 gap-2">
              {QUIZ_CONTACT_METHODS.map((m) => <label key={m.code} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded border p-3 text-body focus-within:outline focus-within:outline-2 focus-within:outline-accent ${contact === m.code ? 'border-accent bg-surface-2' : 'border-muted'}`}><input type="radio" name={`${id}-contact`} required value={m.code} checked={contact === m.code} onChange={() => onContactChange({ contact: m.code })} className="h-4 w-4 shrink-0 accent-accent" />{m.label}</label>)}
            </div>
            {touched && !contact && <p id={`${id}-method`} className="mt-1 text-label text-alert">Выберите способ связи</p>}
          </fieldset>
          <div hidden aria-hidden="true"><input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></div>
          <label className="flex min-h-11 items-start gap-2 text-label text-muted"><input type="checkbox" required checked={consent} onChange={(e) => onContactChange({ consent: e.target.checked })} aria-describedby={touched && !consent ? `${id}-consent` : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-accent" /><span>Согласен с <a href={`${import.meta.env.BASE_URL}privacy/`} target="_blank" rel="noopener noreferrer" className="underline">политикой обработки персональных данных</a></span></label>
          {touched && !consent && <p id={`${id}-consent`} className="text-label text-alert">Нужно согласие на обработку данных</p>}
          <Button type="submit" full disabled={status === 'sending'}>{status === 'sending' ? 'Отправляем…' : 'Получить подборку'}</Button>
          <Button variant="link" size="md" className="min-h-11" onClick={onBack}>Назад к вопросам</Button>
        </fieldset>
        {status === 'error' && <p role="alert" className="mt-3 text-label text-alert">Не удалось отправить заявку. Попробуйте ещё раз или позвоните: <a href={`tel:${PHONE.tel}`} className="font-bold text-ink">{PHONE.display}</a></p>}
      </form>
    </div>
  )
}
