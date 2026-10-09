import { useEffect, useRef, useState } from 'react'
import Button from '../Button.jsx'
import { toggleQuizFeature } from '../../data/quiz.js'

export default function QuizStep({ question, step, value = '', onAnswer, onNext, onBack }) {
  const timer = useRef(null)
  const locked = useRef(false)
  const [pending, setPending] = useState(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  function choose(code) {
    if (locked.current) return
    if (question.type === 'multi') { onAnswer(toggleQuizFeature(value, code)); return }
    onAnswer(code)
    locked.current = true
    setPending(true)
    timer.current = setTimeout(() => onNext(code), 250)
  }
  return (
    <>
      <p className="mb-2 text-label text-muted" aria-live="polite">Шаг {step + 1} из 5</p>
      <progress aria-label="Прогресс подбора" value={(step + 1) * 20} max="100" className="mb-6 block h-1.5 w-full overflow-hidden rounded bg-surface-2 accent-accent [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent" />
      <fieldset disabled={pending}>
        <legend className="sr-only">{question.title}</legend>
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
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {step > 0 && <Button variant="link" size="md" className="min-h-11" onClick={onBack}>Назад</Button>}
        {!question.required && <Button variant="link" size="md" className="min-h-11" disabled={pending} onClick={() => onNext('skipped')}>Пропустить</Button>}
        {question.type === 'multi' && <Button disabled={!value || pending} onClick={() => onNext(value)}>Продолжить</Button>}
      </div>
    </>
  )
}
