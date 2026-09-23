import FinalForm from './FinalForm.jsx'
import { callbackWhen } from '../lib/callback.js'

/**
 * Финальная форма (#final) — последний экран перед подвалом, для тех, кто
 * долистал до конца и ни одной кнопки не нажал. Фон forest на всю ширину,
 * крупные вертикальные отступы, заголовок и подзаголовок по центру, форма
 * шириной до 600 px по центру (на телефоне во всю ширину с полями по краям).
 * Подвал (ink) идёт сразу следом: без зазора и без линии между ними.
 */
export default function SectionFinal() {
  const when = callbackWhen()
  return (
    <section id="final" aria-labelledby="final-title" className="bg-forest py-20 text-surface md:py-32">
      <div className="mx-auto max-w-container px-gutter md:px-gutter-lg">
        <h2 id="final-title" className="text-center text-heading">
          Рассчитаем вашу баню
        </h2>
        <p className="mx-auto mt-4 max-w-measure text-center text-lead text-muted-on-dark">
          Оставьте телефон — менеджер перезвонит {when}, задаст пару вопросов и пришлёт расчёт с ценой
        </p>
        <div className="mx-auto mt-10 max-w-[600px] md:mt-12">
          <FinalForm />
        </div>
      </div>
    </section>
  )
}
