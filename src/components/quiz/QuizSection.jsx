import { useEffect, useRef, useState } from 'react'
import Button from '../Button.jsx'
import { photoSrc } from '../ResponsivePhoto.jsx'
import { track } from '../../lib/track.js'
import { QUIZ_TITLE, QUIZ_SUBTITLE, QUIZ_QUESTIONS, emptyQuizState, readQuizState, saveQuizState, validQuizAnswer } from '../../data/quiz.js'
import QuizDialog from './QuizDialog.jsx'
import QuizStep from './QuizStep.jsx'
import QuizFinalForm from './QuizFinalForm.jsx'
import QuizFloatingReminder from './QuizFloatingReminder.jsx'

export default function QuizSection() {
  const [state, setState] = useState(readQuizState)
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const openerRef = useRef(null)
  const launchRef = useRef(null)
  const startedAt = useRef(Date.now())
  useEffect(() => { saveQuizState(state) }, [state])
  function start(source) {
    if (!mounted || state.completed) startedAt.current = Date.now()
    if (state.completed) { setState({ ...emptyQuizState(state.started), widget: 'expanded' }); setAttempt((n) => n + 1) }
    else setState((s) => ({ ...s, widget: s.widget === 'hidden' ? 'expanded' : s.widget }))
    openerRef.current = document.activeElement
    setMounted(true)
    setOpen(true)
    track('quiz_open', { source })
  }
  function close() {
    if (!open) return
    if (!state.completed) track('quiz_close', { step: Math.min(state.step + 1, 5) })
    setState((s) => ({ ...s, widget: s.completed ? 'hidden' : s.widget }))
    setOpen(false)
  }
  function answer(value) {
    if (!state.started) track('quiz_start')
    setState((s) => ({ ...s, started: true, answers: { ...s.answers, [QUIZ_QUESTIONS[s.step].field]: value } }))
  }
  function next(value) {
    const q = QUIZ_QUESTIONS[state.step]
    if (!q || !validQuizAnswer(q, value)) return
    track('quiz_step', { step: state.step + 1, question: q.id })
    setState((s) => ({ ...s, started: true, step: s.step + 1, answers: { ...s.answers, [q.field]: value } }))
  }
  function success() {
    setState((s) => ({ ...s, completed: true, answers: {}, step: 5, widget: 'hidden' }))
  }
  const question = QUIZ_QUESTIONS[state.step]
  return (
    <>
      <section id="quiz" aria-labelledby="quiz-title" className="bg-surface py-section-y text-ink md:py-section-y-lg">
        <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
          <div className="relative isolate flex min-h-[360px] items-center justify-center overflow-hidden rounded-md bg-forest px-6 py-12 text-center text-surface md:min-h-[400px] md:px-12 md:py-16">
            <img src={photoSrc('quiz-bg-plan', 1280)} srcSet={`${photoSrc('quiz-bg-plan', 640)} 640w, ${photoSrc('quiz-bg-plan', 1280)} 1280w`} sizes="(min-width: 1200px) 1104px, (min-width: 768px) calc(100vw - 96px), calc(100vw - 48px)" width="1280" height="714" alt="" aria-hidden="true" loading="lazy" decoding="async" className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(16,35,29,0.82),rgba(16,35,29,0.78),rgba(16,35,29,0.82))]" />
            <div className="max-w-[800px]">
              <div aria-hidden="true" className="mx-auto mb-6 h-0.5 w-16 bg-accent" />
              <h2 id="quiz-title" className="text-heading">{QUIZ_TITLE}</h2>
              <p className="mt-4 text-lead">{QUIZ_SUBTITLE}</p>
              <p className="mt-4 text-label">Займёт около 1 минуты</p>
              <Button ref={launchRef} className="mt-8" fullMobile onClick={() => start('section')}>Начать подбор</Button>
            </div>
          </div>
        </div>
      </section>
      {mounted && <QuizDialog open={open} finalStep={state.step >= 5} title={question?.title || 'Готово — подберём подходящие варианты'} onClose={close} openerRef={openerRef} fallbackRef={launchRef}>
        {state.step < 5 ? open && <QuizStep key={state.step} question={question} step={state.step} value={state.answers[question.field]} onAnswer={answer} onNext={next} onBack={() => setState((s) => ({ ...s, step: s.step - 1 }))} />
          : <QuizFinalForm key={attempt} startedAt={startedAt.current} answers={state.answers} onSuccess={success} onBack={() => setState((s) => ({ ...s, step: 4 }))} />}
      </QuizDialog>}
      {!state.completed && <div hidden={open}><QuizFloatingReminder state={state.widget} step={state.step} onOpen={start} onCollapse={() => setState((s) => ({ ...s, widget: 'compact' }))} /></div>}
    </>
  )
}
