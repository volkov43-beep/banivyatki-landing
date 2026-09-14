# banivyatki-landing

Лендинг «Бани Вятки» — мобильная баня формы «подкова», Киров.

## Стек

Vite + React + Tailwind CSS 3.

```bash
npm install
npm run dev      # локальный сервер
npm run build    # сборка в dist/
npm run preview  # просмотр сборки
```

## Структура

```
src/
  App.jsx
  main.jsx
  index.css                       — Tailwind, базовые стили, фокус, reduced-motion
  styles/tokens.css               — дизайн-токены: палитра, типографика, сетка
  components/
    SectionComparison.jsx         — экран «Чем подкова отличается от бани-бочки»
    CrossSectionDiagram.jsx       — SVG-схема: два сечения в одном масштабе
    AdvantageItem.jsx             — один из четырёх блоков под схемой
```

## Дизайн-система

Все значения объявлены CSS-переменными в `src/styles/tokens.css` и подключены
в Tailwind через `theme.extend` (`tailwind.config.js`): цвета `ink`, `surface`,
`accent`, `muted`, `alert`; размеры текста `text-heading`, `text-lead`,
`text-title`, `text-body`, `text-label`; контейнер `max-w-container`,
отступы `px-gutter` / `px-gutter-lg`, `py-section-y` / `py-section-y-lg`.

Гарнитура Onest (400, 700) подключается с Google Fonts в `index.html`.

## Публикация

Сайт публикуется на GitHub Pages workflow'ом `.github/workflows/deploy-pages.yml`
при каждом пуше в `main` (или вручную через «Run workflow»). Адрес:
https://volkov43-beep.github.io/banivyatki-landing/

В настройках репозитория (Settings → Pages) источник должен быть «GitHub Actions».
Для приватного репозитория Pages доступен только на платных планах GitHub;
на бесплатном плане репозиторий должен быть публичным.
