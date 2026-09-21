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
    Header.jsx                    — шапка: название и телефон поверх первого экрана
    SectionHero.jsx               — первый экран: картинка, заголовок, цена, кнопка
    SectionComparison.jsx         — экран «Чем Подкова отличается от бани-бочки»
    SectionInside.jsx             — экран «Что внутри» на светлом фоне
    CrossSectionDiagram.jsx       — SVG-схема: два сечения в одном масштабе, силуэты
    AdvantageItem.jsx             — один из четырёх блоков под схемой
    PhotoSlot.jsx                 — место под фото 4:3 с рамкой-заглушкой
    diagrams/
      Diagram.jsx                 — общий каркас схем: тёмная/светлая схема, масштаб
      MicroDiagram.jsx            — микро-схемы 240×150 для тёмного экрана
      VentilationDiagram.jsx      — вентиляция: сечение бани сбоку
      WallSectionDiagram.jsx      — утепление: сечение стены
      RoofDiagram.jsx             — кровельный пирог
      FrameJointDiagram.jsx       — узел обвязки и стяжка бочки
      DrainFloorDiagram.jsx       — сечение двойного проливного пола
      BodyCurveDiagram.jsx        — спина по дуге стены
public/
  photos/                         — фотографии (WebP)
```

## Дизайн-система

Все значения объявлены CSS-переменными в `src/styles/tokens.css` и подключены
в Tailwind через `theme.extend` (`tailwind.config.js`): цвета `ink`, `surface`,
`accent`, `muted`, `alert`, а для тёмных секций `muted-on-dark` и `alert-on-dark`
(`muted` и `alert` на фоне `ink` не проходят контраст AA); размеры текста `text-heading`, `text-lead`,
`text-title`, `text-body`, `text-label`; контейнер `max-w-container`,
отступы `px-gutter` / `px-gutter-lg`, `py-section-y` / `py-section-y-lg`.

Гарнитура Onest (400, 700) подключается с Google Fonts в `index.html`.

## Фотографии

Положите файл WebP в `public/photos/` и укажите путь в `PhotoSlot`:

```jsx
<PhotoSlot src="photos/drain-floor.webp" alt="…" caption="…" />
```

Путь относительно `public/`, базовый путь сайта подставляется сам.
Пока `src` пустой, компонент рисует полосу-заглушку с текстом «фото».
`width`/`height` — размер файла, `aspect` — пропорция кадра на странице
(по умолчанию 4/3, лишнее обрезается), `scheme="light"` для светлых секций.

Конвертация: WebP, качество 80, ширина не больше 1200 px. Оригиналы
в репозиторий не коммитим. Например, через sharp:

```bash
npx -y sharp-cli -i PROZ6025_HDR.jpg -o public/photos/pech.webp resize 1200 -f webp -q 80
```

## Задел на калькулятор

В результате расчёта доставка показывается отдельной строкой:
«Доставка — рассчитаем по адресу», кроме вариантов, где она входит в цену.
Нижняя граница калькулятора обязана совпадать с ценой на первом экране:
от 293 000 ₽ под ключ.

## Публикация

Сайт публикуется на GitHub Pages workflow'ом `.github/workflows/deploy-pages.yml`
при каждом пуше в `main` (или вручную через «Run workflow»). Адрес:
https://volkov43-beep.github.io/banivyatki-landing/

В настройках репозитория (Settings → Pages) источник должен быть «GitHub Actions».
Для приватного репозитория Pages доступен только на платных планах GitHub;
на бесплатном плане репозиторий должен быть публичным.
