import { PHONE } from '../data/calculator.js'

const BASE = import.meta.env.BASE_URL

/** Подвал: оператор, контакты, ссылка на политику. */
export default function Footer() {
  return (
    <footer className="bg-ink py-10 text-surface">
      <div className="mx-auto flex max-w-container flex-wrap items-start justify-between gap-x-12 gap-y-4 px-gutter text-[15px] md:px-gutter-lg">
        <div>
          <p className="font-bold">Бани Вятки</p>
          <p className="mt-1 text-muted-on-dark">ООО «Банная философия», г. Киров, ул. Ленина, 71Б</p>
        </div>
        <div className="flex flex-col gap-1">
          <a href={`tel:${PHONE.tel}`} className="font-bold no-underline">
            {PHONE.display}
          </a>
          <a href="mailto:banivyatki@mail.ru" className="no-underline">
            banivyatki@mail.ru
          </a>
          <a href={`${BASE}privacy/`} className="text-muted-on-dark underline">
            Политика конфиденциальности
          </a>
        </div>
      </div>
    </footer>
  )
}
