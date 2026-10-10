import Button from '../Button.jsx'

export default function QuizFloatingReminder({ state, onOpen, onCollapse }) {
  if (state === 'hidden') return null
  return (
    <aside aria-label="Подбор бани" className="fixed bottom-[calc(88px_+_env(safe-area-inset-bottom))] left-3 z-10 max-w-[calc(100vw_-_24px)] md:bottom-6 md:left-6">
      {state === 'compact' ? <Button size="md" onClick={() => onOpen('compact')}>Подобрать баню</Button> : (
        <div className="relative flex max-w-[420px] items-center gap-3 rounded-md bg-forest p-3 pr-12 text-surface md:w-[280px] md:flex-col md:items-start md:gap-4 md:p-5 md:pr-12">
          <p className="text-label md:text-title"><span className="md:hidden">Подберём баню за 1 минуту</span><span className="hidden md:inline">Подберём баню<br />за 5 вопросов</span></p>
          <Button size="md" className="shrink-0 px-3" onClick={() => onOpen('floating')}>Продолжить</Button>
          <button type="button" aria-label="Свернуть напоминание" onClick={onCollapse} className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded text-[28px] hover:text-accent"><span aria-hidden="true">×</span></button>
        </div>
      )}
    </aside>
  )
}
