import Button from '../Button.jsx'
import { photoSrc } from '../ResponsivePhoto.jsx'

export default function QuizFloatingReminder({ state, step, onOpen, onCollapse }) {
  if (state === 'hidden') return null
  return (
    <aside aria-label="Подбор бани" className="fixed bottom-[calc(88px_+_env(safe-area-inset-bottom))] left-3 z-10 max-w-[calc(100vw_-_24px)] md:bottom-6 md:left-6">
      {state === 'compact' ? <Button size="md" onClick={() => onOpen('compact')}>Подобрать баню</Button> : (
        <div className="relative grid w-[360px] max-w-full grid-cols-[88px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-md bg-forest p-3 pr-11 text-surface md:w-[256px] md:grid-cols-1 md:justify-items-center md:gap-3 md:p-4 md:pt-11 md:text-center">
          <img src={photoSrc('podkova-35-plan', 640)} width="640" height="478" alt="" aria-hidden="true" loading="lazy" decoding="async" className="row-span-2 h-[66px] w-[88px] rounded object-contain md:row-span-1 md:h-[120px] md:w-40" />
          <div className="min-w-0 md:w-full">
            <p className="text-label font-bold md:text-title">Продолжить подбор бани</p>
            <p className="mt-2 text-label">{step >= 5 ? 'Осталось оставить контакты' : `Вы остановились на шаге ${step + 1} из 5`}</p>
          </div>
          <Button size="md" className="justify-self-start md:justify-self-center" onClick={() => onOpen('floating')}>Продолжить</Button>
          <button type="button" aria-label="Свернуть напоминание" onClick={onCollapse} className="absolute right-0 top-0 flex h-11 w-11 cursor-pointer items-center justify-center rounded text-[28px] hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-accent"><span aria-hidden="true">×</span></button>
        </div>
      )}
    </aside>
  )
}
