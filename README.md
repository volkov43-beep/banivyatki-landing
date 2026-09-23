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
  data/calculator.js              — цены и тексты калькулятора
  data/reviews.js                 — отзывы: площадки, карточки, отзыв для бизнеса
  data/faq.js                     — частые вопросы
  data/objects.js                 — места, где стоят бани: названия и координаты
  lib/                            — submitLead, track, utm, callback, phone
  pages/PrivacyPage.jsx           — страница /privacy/
  styles/tokens.css               — дизайн-токены: палитра, типографика, сетка
  components/
    Header.jsx                    — шапка: название и телефон поверх первого экрана
    SectionHero.jsx               — первый экран: картинка, заголовок, цена, кнопка
    SectionComparison.jsx         — экран «Чем Подкова отличается от бани-бочки»
    SectionCalculator.jsx         — калькулятор: вкладки, сезон, карточки, форма
    calculator/                   — Segmented, FloorPlan, CalculatorCard, LeadForm
    Footer.jsx                    — подвал с контактами и ссылкой на политику
    SectionInside.jsx             — экран «Что внутри» на светлом фоне
    SectionMap.jsx                — экран «Где стоят наши бани»: карта Яндекса и список мест
    SectionProcess.jsx            — экран «Как проходит заказ»: пять шагов
    SectionReviews.jsx            — экран «Отзывы»: семь настоящих отзывов
    ReviewCard.jsx                — карточка отзыва
    SourceIcon.jsx                — иконка площадки отзывов
    RatingStars.jsx               — звёзды рейтинга (инлайн-SVG)
    SectionFaq.jsx                — экран «Частые вопросы»: аккордеон, JSON-LD
    FaqQuestionForm.jsx           — форма вопроса под FAQ
    CrossSectionDiagram.jsx       — SVG-схема: два сечения в одном масштабе, силуэты
    AdvantageItem.jsx             — один из четырёх блоков под схемой
    PhotoSlot.jsx                 — место под фото 4:3 с рамкой-заглушкой
    diagrams/
      Diagram.jsx                 — общий каркас схем: тёмная/светлая схема, масштаб
      MicroDiagram.jsx            — микро-схемы 240×150 для тёмного экрана
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

## Карта Яндекса

Блок «Где стоят наши бани» использует JavaScript API Яндекс Карт v3. Ключ
берётся из переменной окружения `VITE_YMAPS_KEY` при сборке (локально —
файл `.env`, см. `.env.example`; на GitHub Pages — секрет репозитория с тем же
именем). Без ключа сайт собирается, блок показывает только список мест.

Координаты мест: `VITE_YMAPS_KEY=… node scripts/geocode.mjs` — скрипт
спрашивает HTTP Геокодер и переписывает `src/data/objects.js`.

## ⚠️ Формы пока никуда не отправляют заявки

**Не запускать рекламу до подключения Битрикс24.** Вся отправка идёт через
одну функцию `submitLead(payload)` в `src/lib/submitLead.js`; сейчас она
только пишет заявку в `console.log` и возвращает успех.

## Калькулятор

Данные карточек и цены — в одном файле `src/data/calculator.js`. Минимальная
цена (`MIN_PRICE`, 293 000 ₽) автоматически показывается на первом экране,
поэтому цены на странице не могут разойтись. Доставка в карточках — отдельной
строкой: «Доставка — рассчитаем по адресу», кроме вариантов, где входит в цену.

Состав `payload` заявки: `form`, `season`, `card_id`, `card_title`, `size`,
`price_shown`, `phone`, `name`, `company`/`comment` (только для бизнеса),
`contact_method`, `utm_*`, `page_url`, `submitted_at`. UTM-метки сохраняются
в `sessionStorage` при первом заходе (`src/lib/utm.js`).

Обещание перезвонить считается по московскому времени (`src/lib/callback.js`);
для проверки время подменяется параметром `?now=2026-09-26T20:00`.

Цели Яндекс.Метрики — `track(goal)` в `src/lib/track.js`; номер счётчика
`YM_COUNTER_ID` пока `null`, без счётчика функция ничего не делает.

Страница политики конфиденциальности — `/privacy/` (`privacy/index.html`,
`src/pages/PrivacyPage.jsx`), собирается как вторая страница Vite.

## Публикация

Сайт публикуется на GitHub Pages workflow'ом `.github/workflows/deploy-pages.yml`
при каждом пуше в `main` (или вручную через «Run workflow»). Адрес:
https://volkov43-beep.github.io/banivyatki-landing/

В настройках репозитория (Settings → Pages) источник должен быть «GitHub Actions».
Для приватного репозитория Pages доступен только на платных планах GitHub;
на бесплатном плане репозиторий должен быть публичным.
