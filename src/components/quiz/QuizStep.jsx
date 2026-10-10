import { useEffect, useRef, useState } from 'react'
import Button from '../Button.jsx'
import { toggleQuizFeature } from '../../data/quiz.js'

export default function QuizStep({ question, step, value = '', onAnswer, onNext, onBack }) {
  const timer = useRef(null)
  const locked = useRef(false)
  const selected = useRef(value)
  const [pending, setPending] = useState(false)
  useEffect(() => { selected.current = value }, [value])
  useEffect(() => () => clearTimeout(timer.current), [])
  function choose(code) {
    if (locked.current) return
    selected.current = question.type === 'multi' ? toggleQuizFeature(selected.current, code) : code
    onAnswer(selected.current)
    clearTimeout(timer.current)
    timer.current = setTimeout(advance, 250)
  }
  function advance() {
    if (locked.current) return
    locked.current = true
    clearTimeout(timer.current)
    setPending(true)
    onNext(selected.current || 'skipped')
  }
  function back() {
    if (locked.current) return
    locked.current = true
    clearTimeout(timer.current)
    onBack()
  }
  return (
    <>
      <p className="mb-2 text-label text-muted" aria-live="polite">Шаг {step + 1} из 5</p>
      {question.required && <p className="mb-3 text-label text-muted">* Обязательный вопрос</p>}
      <progress aria-label="Прогресс подбора" value={(step + 1) * 20} max="100" className="mb-6 block h-1.5 w-full overflow-hidden rounded bg-surface-2 accent-accent [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent" />
      <fieldset disabled={pending}>
        <legend className="sr-only">{question.title}</legend>
        <p className="mb-4 text-label text-muted">{question.required ? 'Выберите один вариант' : 'Если затрудняетесь ответить — нажмите «Далее».'}</p>
        {question.type === 'multi' && <p className="mb-4 text-body text-muted">Можно выбрать несколько вариантов</p>}
        <div className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
          {question.options.map((option) => {
            const checked = value.split(',').includes(option.code)
            return <label key={option.code} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border p-4 text-body focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${checked ? 'border-accent bg-surface-2' : 'border-muted bg-surface hover:border-accent'}`}>
              <input type={question.type === 'multi' ? 'checkbox' : 'radio'} name={question.id} value={option.code} checked={checked} onChange={() => choose(option.code)} onClick={() => { if (checked && question.type === 'single') choose(option.code) }} className="h-5 w-5 shrink-0 accent-accent" />
              <span className="min-w-0">{option.label}</span>
            </label>
          })}
        </div>
      </fieldset>
      {step > 0 && <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" aria-label="Предыдущий вопрос" disabled={pending} onClick={back} className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded border border-accent text-accent hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7" /></svg>
        </button>
        <Button size="md" className="h-12" disabled={pending} onClick={advance}>Далее</Button>
      </div>}
    </>
  )
}
