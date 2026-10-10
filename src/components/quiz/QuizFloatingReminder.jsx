import Button from '../Button.jsx'
import { photoSrc } from '../ResponsivePhoto.jsx'

export default function QuizFloatingReminder({ state, step, onOpen, onCollapse }) {
  if (state === 'hidden') return null
  return (
    <aside aria-label="Подбор бани" className="fixed bottom-[calc(88px_+_env(safe-area-inset-bottom))] left-3 z-10 max-w-[calc(100vw_-_24px)] md:bottom-6 md:left-6">
      {state === 'compact' ? <Button size="md" onClick={() => onOpen('compact')}>Подобрать баню</Button> : (
        <div className="relative isolate flex max-w-[420px] items-center gap-3 overflow-hidden rounded-md bg-forest p-3 pr-11 text-surface md:w-[256px] md:flex-col md:gap-3 md:p-4 md:text-center">
          <img src={photoSrc('quiz-bg-plan', 640)} width="640" height="357" alt="" aria-hidden="true" loading="lazy" decoding="async" className="pointer-events-none absolute inset-0 -z-20 h-full w-full object-cover" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[rgba(16,35,29,0.82)]" />
          <div className="min-w-0 md:w-full">
            <p className="text-label md:px-7 md:text-title"><span className="md:hidden">Подберём баню за 1 минуту</span><span className="hidden md:inline">Подберём баню<br />за 5 вопросов</span></p>
            <p className="mt-2 text-label">{step >= 5 ? 'Осталось оставить контакты' : `Вы остановились на шаге ${step + 1} из 5`}</p>
          </div>
          <Button size="md" className="shrink-0 px-3" onClick={() => onOpen('floating')}>Далее</Button>
          <button type="button" aria-label="Свернуть напоминание" onClick={onCollapse} className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded text-[28px] hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"><span aria-hidden="true">×</span></button>
        </div>
      )}
    </aside>
  )
}
