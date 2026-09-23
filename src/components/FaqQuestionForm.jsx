import { useEffect, useRef, useState } from 'react'
import Segmented from './calculator/Segmented.jsx'
import Button from './Button.jsx'
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

/** Поле на светлой карточке — как в форме калькулятора: фон surface, рамка muted, плейсхолдер muted. */
const fieldClass = 'w-full rounded border border-muted bg-surface px-4 py-3 text-body text-ink placeholder:text-muted'

/**
 * Карточка «Не нашли ответ?» под списком вопросов: светлая карточка на
 * surface-2 с тонкой рамкой, читается как часть блока FAQ, а не отдельный
 * тёмный экран. Заголовок и подзаголовок по центру, поля и кнопка на всю
 * ширину карточки, переключатель «Звонок / MAX» со схемой accent.
 * Обещание по московскому времени — общая callbackWhen() из lib/callback.js.
 *
 * Защита как в калькуляторе: скрытое поле-ловушка и минимум 3 секунды на заполнение.
 * Отправка через submitLead() с form: "faq_question"; после отправки форма
 * скрывается, карточка показывает подтверждение. При ошибке — сообщение под
 * кнопкой, введённый текст остаётся.
 */
export default function FaqQuestionForm() {
  const [question, setQuestion] = useState('')
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

  const questionOk = question.trim().length > 0
  const phoneOk = isCompletePhone(phone)

  async function handleSubmit(e) {
    e.preventDefault()
    setTouched(true)
    if (!questionOk || !phoneOk || !consent) return

    // Ловушка для ботов: поле заполнено или форма отправлена быстрее 3 секунд
    if (trap || Date.now() - mountedAt.current < MIN_FILL_MS) {
      setStatus('done')
      return
    }

    const payload = {
      form: 'faq_question',
      question: question.trim(),
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
      track('faq_question_submit')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const error = (text) => <span className="mt-1 block text-label text-alert">{text}</span>

  return (
    <div className="rounded-md border border-[rgba(26,21,18,0.12)] bg-surface-2 p-5 text-ink md:p-8">
      {status === 'done' ? (
        <p role="status" className="text-center text-title">
          Вопрос отправлен. Менеджер ответит {when}.
        </p>
      ) : (
        <>
          <h3 className="text-center text-[24px] font-bold leading-[1.2]">Не нашли ответ?</h3>
          <p className="mt-2 text-center text-body text-muted">Напишите вопрос — менеджер ответит {when}</p>

          <form onSubmit={handleSubmit} noValidate className="mt-6">
            <div className="flex flex-col gap-4">
              <label className="block">
                <span className="sr-only">Ваш вопрос</span>
                <textarea
                  rows="3"
                  required
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ваш вопрос"
                  aria-invalid={touched && !questionOk}
                  className={fieldClass}
                />
                {touched && !questionOk && error('Напишите вопрос')}
              </label>

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

              <Segmented label="Как связаться" options={CONTACT} value={contact} onChange={setContact} size="sm" full scheme="accent" />

              {/* Ловушка для ботов: людям не видна */}
              <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label>
                  Сайт
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                </label>
              </div>
            </div>

            <Button type="submit" disabled={status === 'sending'} full className="mt-6">
              Задать вопрос
            </Button>

            {status === 'error' && (
              <p role="alert" className="mt-3 text-body text-alert">
                Вопрос не отправился. Попробуйте ещё раз или позвоните нам.
              </p>
            )}

            <label className="mt-4 flex items-start gap-3 text-[15px] text-muted">
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
